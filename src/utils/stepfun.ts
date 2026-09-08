// AI 文案 + 生图客户端（阶跃星辰 stepfun，OpenAI 兼容，前端直调）。
// key 从构建环境注入：.env 里 VITE_STEPFUN_API_KEY=sk-...（.env 已被 gitignore，不会入库）。
// 需求：AI 接口统一生成文案，失败时由调用方降级到本地模板（见 cardGenerator / cardImage）。

const STEPFUN_BASE = 'https://api.stepfun.com/v1';
const CHAT_MODEL = 'step-3.7-flash'; // 已验证：便宜、中文好、带 reasoning 但 content 干净
const IMAGE_MODEL = 'step-image-edit-2'; // 已验证：response_format=b64_json 直接回 base64（绕开 URL 24h 过期 + CDN 无 CORS）

export function getStepfunKey(): string {
  // Vite 编译期注入（import.meta.env.VITE_* 见 .env）；未配置返回空串
  return (import.meta.env.VITE_STEPFUN_API_KEY as string | undefined) ?? '';
}

export type AICopy = { name: string; description: string };

/** 生成卡牌文案。失败/超时/未配置 key 时返回 null（调用方降级）。 */
export async function generateAICopy(sourceTasks: string[]): Promise<AICopy | null> {
  const key = getStepfunKey();
  if (!key) return null;
  try {
    const list = sourceTasks.join('、') || '（无）';
    const body = {
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是「离谱发明所」APP 的卡牌文案生成器。用户给出"今日完成的任务列表"。' +
            '请基于这些真实任务，构思一个荒诞但可自圆其说的发明卡牌：' +
            '卡牌名称 4-10 个汉字；卡牌描述 40-80 字、幽默冷静的说明书口吻、只允许围绕给定的任务展开，禁止编造任何任务之外的事实或细节。' +
            '只输出一个 JSON 对象，不要输出任何解释或多余文字：{"name":"卡牌名称","description":"卡牌描述"}',
        },
        { role: 'user', content: `今日完成任务：${list}` },
      ],
      temperature: 1.0,
      max_tokens: 1000,
    };
    const resp = await fetchWithTimeout(`${STEPFUN_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    }, 45_000);
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = extractJSON(raw) as AICopy | null;
    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.description !== 'string') return null;
    return { name: parsed.name.trim().slice(0, 30), description: parsed.description.trim().slice(0, 200) };
  } catch {
    return null; // 网络/超时/解析失败 → 本地降级
  }
}

/** 生成卡牌插画，返回 data:image/png;base64,...（可直接 canvas 处理并持久化进 localStorage，无过期/CORS 问题）。失败/未配置 key 返回 null。 */
export async function generateArtworkDataURL(prompt: string): Promise<string | null> {
  const key = getStepfunKey();
  if (!key) return null;
  try {
    const body = {
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json', // 实测 200：data[0].b64_json 约 1.2MB base64
    };
    const resp = await fetchWithTimeout(`${STEPFUN_BASE}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    }, 120_000); // 生图耗时较长
    if (!resp.ok) return null;
    const json = (await resp.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

/** fetch 包装：超时中止 */
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 从模型输出中抠出 JSON（容忍 ```json 围栏 / 前后杂文） */
function extractJSON(raw: string): unknown {
  // 优先找 {...} 或 [...] 块
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.search(/[\[{]/);
  if (start === -1) return null;
  for (let end = candidate.length; end > start; end--) {
    const chunk = candidate.slice(start, end);
    try {
      return JSON.parse(chunk);
    } catch {
      /* 继续收缩 */
    }
  }
  return null;
}
