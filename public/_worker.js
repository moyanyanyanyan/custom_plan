/**
 * 离谱发明所 · 网页版 AI 代理（Cloudflare Pages Advanced Mode Worker）
 *
 * 与站点同域可以让前端使用相对路径，减少跨域与外部代理配置。
 *
 * 部署方式：本文件位于 `public/`，`vite build` 会把它原样复制到 `dist/_worker.js`，
 * Pages 见到输出目录根部的 `_worker.js` 即以它作为唯一入口（Advanced Mode），
 * 静态资源由 `env.ASSETS` 转发。控制台直传 zip 与连 GitHub 自动构建两种方式都适用。
 *
 * 必需配置：Pages 项目 → Settings → 变量和机密 → 添加 `STEPFUN_API_KEY`
 *          （密钥只存在服务端，绝不可打进前端产物）。
 * 可选配置：绑定名为 `USAGE_LIMITER` 的 Durable Object 可获得跨实例精确限流；
 *          未绑定时自动退回进程内计数（软保护，见 allowRequest 注释）。
 */

const STEPFUN_BASE = 'https://api.stepfun.com/v1';
const DEFAULT_COPY_LIMIT = 20;
const DEFAULT_ART_LIMIT = 5;
const MAX_BODY_BYTES = 64 * 1024;

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  });

/** 同域部署本不需要 CORS；仅为本地 dev（127.0.0.1:1420 / localhost）保留最小放行。 */
function corsHeaders(request, url) {
  const origin = request.headers.get('Origin');
  const sameOrigin = origin === url.origin;
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  if (!origin || (!sameOrigin && !isLocal)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function validId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(id);
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
  return JSON.parse(text || '{}');
}

async function upstream(env, path, payload) {
  if (!env.STEPFUN_API_KEY) throw new Error('MISSING_SERVER_KEY');
  const response = await fetch(`${STEPFUN_BASE}/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STEPFUN_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(75_000),
  });
  if (response.status === 429) throw new Error('UPSTREAM_RATE_LIMITED');
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  return response.json();
}

/**
 * 限流。优先用 Durable Object（跨实例精确，按 日期+接口+设备+IP 计数）；
 * 未绑定 USAGE_LIMITER 时退回进程内 Map——注意它**不跨实例、重启即清零**，
 * 只防止单实例内的滥用，属于软保护（控制台直传 zip 无法声明 DO 绑定时就落在这里）。
 */
const memoryCounters = new Map();

async function allowRequest(env, key, limit) {
  if (env.USAGE_LIMITER) {
    try {
      const id = env.USAGE_LIMITER.idFromName(key);
      const response = await env.USAGE_LIMITER.get(id).fetch(`https://limiter/check?limit=${limit}`);
      return response.ok;
    } catch {
      // DO 不可用时不要放大成 5xx，退回软保护继续服务
    }
  }
  const current = memoryCounters.get(key) || 0;
  if (current >= limit) return false;
  if (memoryCounters.size > 5000) memoryCounters.clear();
  memoryCounters.set(key, current + 1);
  return true;
}

/**
 * 卡牌插画提示词。与 Rust 侧 src-tauri/src/ai/prompts.rs::card_art 同口径，两条硬约束：
 * 1. **绝不出现中文** —— step-image-edit-2 会把中文卡名当标题画在图顶部，末尾再多
 *    no text/letters 负向词也压不住。所以 name/description 一律不进提示词，
 *    主题相关性完全由文案模型产出的英文 scene 承载（旧版把中文名插进来是 bug）。
 * 2. **scene 排最前、总长压进 500 字符** —— 超长时被截掉的是场景尾巴，而不是尾部约束。
 *    桌面版另有 512 字符上限（/v1/images/edits），这里沿用同一预算以保持两边一致。
 */
function cardArtPrompt(scene) {
  const LIMIT = 500;
  // 网页版没有角色参考图（桌面版走图生图锁角色），head 里不能写 "from the reference image"。
  const head = 'Chibi girl character illustration, actively doing this, in this exact place: ';
  const tail = ' Same chibi girl in every card: one consistent character, same hair, same outfit,'
    + ' same colours. Draw the props and the scene described above.'
    + ' Exactly one head, two arms, two hands.'
    + ' No text, no letters, no watermark, no frame, no border. Fill the canvas.';
  const body = typeof scene === 'string' && scene.trim()
    ? scene.trim()
    // scene 缺失（降级 / 旧响应）仍要求具体场景与道具，绝不退回空实验室
    : 'a specific everyday scene with two concrete props that fit today\'s achievement,'
      + ' never an empty generic laboratory';
  const budget = Math.max(80, LIMIT - (head.length + tail.length));
  return `${head}${body.slice(0, budget)}${tail}`;
}

async function handleApi(request, env, url, cors) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') {
    return json({ code: 'NOT_FOUND', message: 'Not found' }, 404, cors);
  }

  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    const code = error && error.message === 'PAYLOAD_TOO_LARGE' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON';
    return json({ code, message: 'Invalid request' }, 400, cors);
  }

  if (!validId(body.deviceId)) {
    return json({ code: 'INVALID_DEVICE_ID', message: 'Invalid device id' }, 400, cors);
  }

  const kind = url.pathname.endsWith('/copy') ? 'copy' : 'art';
  const limit = Number(
    kind === 'copy'
      ? env.CARD_COPY_DAILY_LIMIT || DEFAULT_COPY_LIMIT
      : env.CARD_ART_DAILY_LIMIT || DEFAULT_ART_LIMIT,
  );

  const valid = kind === 'copy'
    ? Array.isArray(body.sourceTasks)
      && body.sourceTasks.length > 0
      && body.sourceTasks.length <= 50
      && body.sourceTasks.every((task) => typeof task === 'string' && task.length <= 200)
    : typeof body.name === 'string'
      && body.name.length <= 100
      && typeof body.description === 'string'
      && body.description.length <= 500
      // scene 可缺省（旧响应 / 降级），但给了就必须是字符串且不超长
      && (body.scene == null || (typeof body.scene === 'string' && body.scene.length <= 600));

  if (!valid) return json({ code: 'INVALID_INPUT', message: 'Invalid card input' }, 400, cors);

  const day = new Date().toISOString().slice(0, 10);
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const allowed = await allowRequest(env, `${day}:${kind}:${body.deviceId}:${clientIp}`, limit);
  if (!allowed) return json({ code: 'RATE_LIMITED', message: '今日 AI 额度已用完' }, 429, cors);

  try {
    if (kind === 'copy') {
      const result = await upstream(env, 'chat/completions', {
        model: 'step-3.7-flash',
        messages: [
          {
            // 与 Rust 侧 src-tauri/src/ai/prompts.rs::card_copy 保持一致（桌面版/网页版同一口径）。
            // scene 是插画主题相关性的唯一载体：名称与描述都**不进**生图提示词。
            role: 'system',
            content: '你是「离谱发明所」的卡牌文案生成器。'
              + '为用户今日完成的任务生成一张成就卡牌。'
              + '名称用 4-10 个汉字，文采斐然、有诗意，避免直白描述任务内容。'
              + '例如：墨染书卷、清风阅者、绿意守望者、净室儒生、步履成诗。'
              + '描述 40-80 字，幽默冷静的说明书口吻。'
              + 'scene 字段：一句英文场景描述，20-35 个单词，供文生图使用。'
              + 'scene 必须通过这条硬指标：**只看这一句、看不到任务原文的人，也能猜出今天大概做了什么**。'
              + '必须同时写清三件事：①具体地点与时间光线（如清晨的厨房、深夜书桌前的台灯）；②角色正在做的一个明确动作，用动词写出画面（如举筷夹菜、翻开书页、弯腰系鞋带）；③两件与这件事直接相关、能被画出来的道具，写清种类与样子。'
              + '禁止空泛：不得只写 a cozy room / a laboratory / a desk 这类与任务无关的通用背景，不得写抽象心理活动、情绪词或结果评价（如 feeling accomplished）。'
              + '示例（任务「吃饭」→ 22 词）：At a wooden dining table in warm morning light, she raises chopsticks to lift a steamed bun beside a bowl of congee.'
              + 'scene 里严禁描述任何文字、字母、汉字、招牌、标签、铭牌或书写内容；也不要写相机参数、画质词与风格词。'
              + '只能围绕给定任务，不得编造。'
              + '只输出 JSON：{"name":"名称","description":"描述","scene":"english scene"}',
          },
          { role: 'user', content: `今日完成任务：${body.sourceTasks.join('、')}` },
        ],
        temperature: 1,
        max_tokens: 1000,
      });
      const content = (result.choices && result.choices[0] && result.choices[0].message
        && result.choices[0].message.content) || '';
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('INVALID_UPSTREAM_RESPONSE');
      return json(JSON.parse(content.slice(start, end + 1)), 200, cors);
    }

    const result = await upstream(env, 'images/generations', {
      model: 'step-image-edit-2',
      prompt: cardArtPrompt(body.scene),
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });
    const imageBase64 = result.data && result.data[0] && result.data[0].b64_json;
    if (!imageBase64) throw new Error('INVALID_UPSTREAM_RESPONSE');
    return json({ imageBase64, mimeType: 'image/png' }, 200, cors);
  } catch (error) {
    const message = (error && error.message) || '';
    const code = message === 'MISSING_SERVER_KEY'
      ? 'SERVICE_NOT_CONFIGURED'
      : message.includes('RATE_LIMITED')
        ? 'UPSTREAM_RATE_LIMITED'
        : 'AI_SERVICE_ERROR';
    return json({ code, message: 'AI 服务暂不可用' }, 502, cors);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/health') return json({ ok: true }, 200, corsHeaders(request, url));

    if (pathname === '/api/cards/copy' || pathname === '/api/cards/art') {
      return handleApi(request, env, url, corsHeaders(request, url));
    }

    // 其余 /api/* 一律 404，不要落到静态资源（避免被 index.html 兜底成 200 HTML）
    if (pathname.startsWith('/api/')) {
      return json({ code: 'NOT_FOUND', message: 'Not found' }, 404, corsHeaders(request, url));
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

/** 绑定 USAGE_LIMITER 时使用的计数器；未绑定则不会被实例化。 */
export class UsageLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const current = (await this.state.storage.get('count')) || 0;
    const limit = Number(new URL(request.url).searchParams.get('limit') || 1);
    if (current >= limit) return new Response('limited', { status: 429 });
    await this.state.storage.put('count', current + 1);
    return new Response('ok');
  }
}
