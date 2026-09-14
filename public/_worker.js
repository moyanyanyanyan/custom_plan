import { CARD_COPY_SYSTEM_PROMPT, generateCardCopy } from './card-copy-policy.js';

/**
 * 离谱发明所 · 网页版 AI 代理（Cloudflare Pages Advanced Mode Worker）
 *
 * 为什么放在这里：原先代理部署在 `absurd-invention-ai.<account>.workers.dev`，
 * 而 `*.workers.dev` 在中国大陆被 DNS 投毒 + SNI 阻断（实测：换 DNS 拿到真 IP 后
 * 直连仍 ECONNRESET），网页版 AI 必然连不上。Pages 站点域名（`*.pages.dev`）不受影响，
 * 因此把代理搬到 Pages 自己身上、与网页版**同域**，前端改用相对路径 `/api/cards/*`。
 *
 * 部署方式：本文件位于 `public/`，`vite build` 会把它原样复制到 `dist/_worker.js`，
 * Pages 见到输出目录根部的 `_worker.js` 即以它作为唯一入口（Advanced Mode），
 * 静态资源由 `env.ASSETS` 转发。控制台直传 zip 与连 Gitee 自动构建两种方式都适用。
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

/** 名称不合规或格式错误时只纠错一次，避免异常内容进入收藏。 */
async function generateValidatedCopy(env, sourceTasks) {
  return generateCardCopy(async (user) => {
    const result = await upstream(env, 'chat/completions', {
      model: 'step-3.7-flash',
      messages: [
        { role: 'system', content: CARD_COPY_SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      temperature: 1,
      max_tokens: 3000,
    });
    return result.choices?.[0]?.message?.content || '';
  }, sourceTasks);
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
      return json(await generateValidatedCopy(env, body.sourceTasks), 200, cors);
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
