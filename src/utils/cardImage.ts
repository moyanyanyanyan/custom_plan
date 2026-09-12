import type { InventionCard } from '../types/card';
import { generateArtworkDataURL } from './stepfun';

// 卡牌插图：优先调阶跃星辰 Image API（b64_json 模式）真实生成，
// 失败（无 key / 网络 / 超时）时降级为本地 canvas 占位。
// 输出统一为正方形 dataURL（存 localStorage 的 imagePath 字段），无需外网可永久显示。

// 输出尺寸按游戏王卡比例 59:86（宽 400，高约 583）
const OUT_W = 400;
const OUT_H = Math.round(400 * 86 / 59);

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

/** 生图提示词：纯场景插画，非卡牌风格，绝对禁止任何文字。 */
function buildArtPrompt(card: InventionCard): string {
  return [
    'fantasy illustration, scene art',
    'no card frame, no card border, no card layout',
    'STRICTLY NO TEXT, NO LETTERS, NO WORDS, NO TITLES, NO LABELS',
    `theme: "${card.name}"`,
    `${card.description}`,
    'dramatic lighting',
    'highly detailed',
    'vibrant colors',
    'dynamic composition',
  ].join(', ');
}

/** AI 原图 → 缩小 + 叠加中央预制装饰 → dataURL */
function compose(bitmap: ImageBitmap, card: InventionCard): string {
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas 2d');
  // contain 基础上放大 1.12x，裁掉 AI 图常见的白边/外框
  const scale = Math.min(OUT_W / bitmap.width, OUT_H / bitmap.height) * 1.12;
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
  drawDecoration(ctx, card);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/** 纯占位底图 + 装饰（无 key / AI 失败的降级） */
function composeFallback(card: InventionCard): string {
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/placeholder-card.png';
  const g = ctx.createLinearGradient(0, 0, OUT_W, OUT_H);
  g.addColorStop(0, '#232342');
  g.addColorStop(1, '#10101e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, OUT_W - 16, OUT_H - 16);
  drawDecoration(ctx, card);
  return canvas.toDataURL('image/png');
}

/** 中央预制装饰（需求：蓝图 / 齿轮 / 问号），按卡名确定性选择，同 stackKey 同一装饰 */
function drawDecoration(ctx: CanvasRenderingContext2D, card: InventionCard) {
  let h = 0;
  for (const ch of card.stackKey) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  const kind = ['gear', 'blueprint', 'question'][h % 3] as 'gear' | 'blueprint' | 'question';
  ctx.save();
  ctx.translate(OUT_W / 2, OUT_H / 2);
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
