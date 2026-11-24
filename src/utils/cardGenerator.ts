import { fallbackDraft, drawRank, cardStackKey } from './fantasyCards';
import type { Experiment } from '../types/experiment';
import type { CardTier, FantasyCard } from '../types/card';
import { DAILY_CARD_THRESHOLD } from '../constants/generation';
import { localDateKey } from './date';
import type { InventionMachineState } from '../types/card';

/** 计算连续活跃天数（从现有卡片的 dailyKey 推算） */
export function calcStreak(existingCards: { dailyKey: string }[]): number {
  if (!existingCards.length) return 0;
  const keys = [...new Set(existingCards.map(c => c.dailyKey))].sort().reverse();
  let streak = 0;
  const today = new Date();
  const todayStr = localDateKey(today);
  // 从今天或最近一张卡开始往前数
  let check = keys[0];
  // 如果最近一天不是今天，从最近一天开始数
  while (true) {
    const [y, m, d] = check.split('-').map(Number);
    const checkDate = new Date(y, m - 1, d);
    const prevDate = new Date(checkDate.getTime() - 86400000);
    const prevKey = localDateKey(prevDate);
    streak++;
    if (!keys.includes(prevKey)) break;
    check = prevKey;
  }
  return streak;
}

/** 根据连续天数返回材质等级 */
export function getTier(streak: number): CardTier {
  if (streak >= 30) return 'diamond';
  if (streak >= 9) return 'gold';
  if (streak >= 4) return 'silver';
  return 'copper';
}

/** 剩余所需任务数（>0 = 还没到门槛）。 */
export function remainingTasksForCard(tasks: { completed: boolean }[]): number {
  const done = tasks.filter((t) => t.completed).length;
  return Math.max(0, DAILY_CARD_THRESHOLD - done);
}

export function getMachineState(
  remaining: number, generated: boolean, inventing: boolean,
): InventionMachineState {
  if (inventing) return 'generating';
  if (generated) return 'completed';
  return remaining > 0 ? 'locked' : 'ready';
}

/** 生成完整本地卡作为降级底稿，AI 只替换经过校验的文案字段。 */
export function generateCardFromTasks(
  tasks: Experiment[], date = new Date(), existingCards: { dailyKey: string }[] = [], random = Math.random,
): FantasyCard | null {
  const completedTasks = tasks.filter(t => t.completed).map(t => t.name);
  if (completedTasks.length < DAILY_CARD_THRESHOLD) return null;
  const draft = fallbackDraft(completedTasks);
  const card: FantasyCard = {
    id: crypto.randomUUID(), ...draft, version: 2, rank: drawRank(random),
    sourceTasks: completedTasks, earnedAt: date.toISOString(), dailyKey: localDateKey(date),
    type: 'daily', stackKey: '', backTasks: completedTasks.map(t => t.slice(0, 10)),
    date: localDateKey(date), tier: getTier(calcStreak([...existingCards, { dailyKey: localDateKey(date) }])),
  };
  return { ...card, stackKey: cardStackKey(card) };
}
