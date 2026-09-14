import http from 'node:http';
import { CARD_COPY_SYSTEM_PROMPT, generateCardCopy } from '../public/card-copy-policy.js';

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.STEPFUN_API_KEY || '';
const copyLimit = Number(process.env.CARD_COPY_DAILY_LIMIT || 20);
const artLimit = Number(process.env.CARD_ART_DAILY_LIMIT || 5);
const usage = new Map();

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 64 * 1024) reject(new Error('PAYLOAD_TOO_LARGE')); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('INVALID_JSON')); } });
    req.on('error', reject);
  });
}

function allowed(deviceId, ip, kind, limit) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}:${kind}:${deviceId}:${ip}`;
  const count = usage.get(key) || 0;
  if (count >= limit) return false;
  usage.set(key, count + 1);
  return true;
}

function validateCommon(body) {
  if (typeof body.deviceId !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(body.deviceId)) return 'INVALID_DEVICE_ID';
  return null;
}

async function stepfun(path, payload) {
  if (!apiKey) throw new Error('MISSING_SERVER_KEY');
  const response = await fetch(`https://api.stepfun.com/v1/${path}`, {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(75_000),
  });
  if (response.status === 429) throw new Error('UPSTREAM_RATE_LIMITED');
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  return response.json();
}

/** 名称或响应格式不合规时仅纠错一次，之后让调用方使用本地模板。 */
async function generateValidatedCopy(sourceTasks) {
  return generateCardCopy(async (user) => {
    const result = await stepfun('chat/completions', {
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

async function handle(req, res) {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
  if (req.method !== 'POST' || !['/api/cards/copy', '/api/cards/art'].includes(req.url)) return json(res, 404, { code: 'NOT_FOUND', message: 'Not found' });
  let body;
  try { body = await readBody(req); } catch (error) { return json(res, error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { code: error.message, message: 'Invalid request' }); }
  const commonError = validateCommon(body);
  if (commonError) return json(res, 400, { code: commonError, message: 'Invalid device id' });
  const kind = req.url.endsWith('/copy') ? 'copy' : 'art';
  const limit = kind === 'copy' ? copyLimit : artLimit;
  const valid = kind === 'copy'
    ? Array.isArray(body.sourceTasks) && body.sourceTasks.length > 0 && body.sourceTasks.length <= 50 && body.sourceTasks.every((task) => typeof task === 'string' && task.length <= 200)
    : typeof body.name === 'string' && body.name.length <= 100 && typeof body.description === 'string' && body.description.length <= 500;
  if (!valid) return json(res, 400, { code: 'INVALID_INPUT', message: 'Invalid card input' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!allowed(body.deviceId, ip, kind, limit)) return json(res, 429, { code: 'RATE_LIMITED', message: '今日 AI 额度已用完' });
  try {
    if (kind === 'copy') {
      return json(res, 200, await generateValidatedCopy(body.sourceTasks));
    }
    const result = await stepfun('images/generations', { model: 'step-image-edit-2', prompt: `Square illustration. STRICTLY NO TEXT, NO LETTERS, NO WORDS, NO CHINESE CHARACTERS, NO TITLES, NO LABELS anywhere in the image. Pure scene artwork only. Theme inspired by "${body.name}" (${body.description}). Dark blue lab background, steampunk machinery in center, neon glowing tubes, sci-fi atmosphere. No card frame, no card border.`, n: 1, size: '1024x1024', response_format: 'b64_json' });
    const imageBase64 = result.data?.[0]?.b64_json;
    if (!imageBase64) throw new Error('INVALID_UPSTREAM_RESPONSE');
    return json(res, 200, { imageBase64, mimeType: 'image/png' });
  } catch (error) {
    const code = error.message === 'MISSING_SERVER_KEY' ? 'SERVICE_NOT_CONFIGURED' : error.message.includes('RATE_LIMITED') ? 'UPSTREAM_RATE_LIMITED' : 'AI_SERVICE_ERROR';
    return json(res, 502, { code, message: 'AI 服务暂不可用' });
  }
}

http.createServer((req, res) => { void handle(req, res); }).listen(port, '0.0.0.0', () => console.log(`AI proxy listening on ${port}`));
