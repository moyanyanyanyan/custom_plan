import type { InventionCard } from '../types/card';

function keyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 计算截至今天或昨天的连续发明卡牌天数。 */
export function calculateCardStreak(cards: InventionCard[], now = new Date()): number {
  const dates = new Set(cards.flatMap((card) => {
    const key = typeof card.dailyKey === 'string' ? card.dailyKey : card.date;
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? [key] : [];
  }));
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dates.has(keyFromDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(keyFromDate(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
