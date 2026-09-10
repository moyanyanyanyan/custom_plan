import type { InventionCard } from '../types/card';
import { generateArtworkDataURL } from './stepfun';

// 卡牌插图：优先调阶跃星辰 Image API（b64_json 模式）真实生成，
// 失败（无 key / 网络 / 超时）时降级为本地 canvas 占位。
// 输出统一为正方形 dataURL（存 localStorage 的 imagePath 字段），无需外网可永久显示。

const OUT = 400; // 输出边长（压缩后存 localStorage，控制体积）

export type CardImageResult = {
  imagePath: string; // dataURL
  fromAI: boolean;
};

export async function generateCardImage(card: InventionCard): Promise<CardImageResult> {
  // 1) 真实生图（b64_json → dataURL，本地 canvas 处理，无 CORS / URL 过期问题）
  const prompt = buildArtPrompt(card);
  const dataUrl = await generateArtworkDataURL(prompt);
  if (dataUrl) {
    try {
      const blob = b64DataUrlToBlob(dataUrl);
      const bitmap = await createImageBitmap(blob);
      const imagePath = compose(bitmap, card);
      return { imagePath, fromAI: true };
    } catch {
      /* base64 解码 / 解码失败 → 走占位降级 */
    }
  }
  // 2) 降级：canvas 占位
  return { imagePath: composeFallback(card), fromAI: false };
}

/** data:image/png;base64,... → Blob（避免 fetch(dataURL) 的额外开销） */
function b64DataUrlToBlob(dataUrl: string): Blob {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

/** 生图提示词：固定为 Yu-Gi-Oh! 卡牌封面风格，禁止文字/字母/水印。 */
function buildArtPrompt(card: InventionCard): string {
  return [
    'Yu-Gi-Oh! trading card game cover art style',
    `theme: "${card.name}"`,
    `${card.description}`,
    'fantasy illustration',
    'dramatic lighting',
    'highly detailed',
    'vibrant colors',
    'dynamic composition',
    'centered subject with space for text overlay',
    'no text',
    'no letters',
    'no watermark',
  ].join(', ');
}

/** AI 原图 → 缩小 + 叠加中央预制装饰 → dataURL */
function compose(bitmap: ImageBitmap, card: InventionCard): string {
  const canvas = document.createElement('canvas');
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas 2d');
  // cover 铺满
  const scale = Math.max(OUT / bitmap.width, OUT / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (OUT - w) / 2, (OUT - h) / 2, w, h);
  drawDecoration(ctx, card);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/** 纯占位底图 + 装饰（无 key / AI 失败的降级） */
function composeFallback(card: InventionCard): string {
  const canvas = document.createElement('canvas');
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/placeholder-card.png';
  const g = ctx.createLinearGradient(0, 0, OUT, OUT);
  g.addColorStop(0, '#232342');
  g.addColorStop(1, '#10101e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, OUT, OUT);
  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, OUT - 16, OUT - 16);
  // 名称首字
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 90px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.name.slice(0, 1), OUT / 2, OUT / 2 - 30);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '17px sans-serif';
  ctx.fillText('离线占位卡', OUT / 2, OUT / 2 + 60);
  drawDecoration(ctx, card);
  return canvas.toDataURL('image/png');
}

/** 中央预制装饰（需求：蓝图 / 齿轮 / 问号），按卡名确定性选择，同 stackKey 同一装饰 */
function drawDecoration(ctx: CanvasRenderingContext2D, card: InventionCard) {
  let h = 0;
  for (const ch of card.stackKey) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  const kind = ['gear', 'blueprint', 'question'][h % 3] as 'gear' | 'blueprint' | 'question';
  ctx.save();
  ctx.translate(OUT / 2, OUT / 2);
  ctx.strokeStyle = 'rgba(190,225,255,0.38)';
  ctx.fillStyle = 'rgba(190,225,255,0.16)';
  ctx.lineWidth = 2;
  const R = 74;
  if (kind === 'gear') {
    // 齿轮：外齿 + 内圆 + 轴孔
    ctx.beginPath();
    const teeth = 12;
    for (let i = 0; i <= teeth * 2; i++) {
      const ang = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? R : R - 16;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'blueprint') {
    // 蓝图：同心圆 + 十字轴线
    for (const r of [R, R * 0.6, R * 0.28]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-R - 12, 0);
    ctx.lineTo(R + 12, 0);
    ctx.moveTo(0, -R - 12);
    ctx.lineTo(0, R + 12);
    ctx.stroke();
  } else {
    // 问号
    ctx.fillStyle = 'rgba(190,225,255,0.24)';
    ctx.font = `bold ${R * 1.7}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 4);
  }
  ctx.restore();
}
