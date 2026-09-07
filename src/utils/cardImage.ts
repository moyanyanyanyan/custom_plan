import type { InventionCard } from '../types/card';

/**
 * 生成卡牌图片。
 * TODO: 等你准备好阶跃星辰 Image API key 和参考素材后，
 * 把这里改成真实 API 调用即可，其余代码不用改。
 */
export async function generateCardImage(card: InventionCard): Promise<string> {
  // 占位：用 canvas 生成一张简单的占位图
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/placeholder-card.png';
  
  // 背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 400, 400);
  
  // 边框
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 380, 380);
  
  // 文字
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.name, 200, 180);
  
  ctx.fillStyle = '#888888';
  ctx.font = '16px sans-serif';
  ctx.fillText('待 AI 生成', 200, 220);
  
  return canvas.toDataURL('image/png');
}
