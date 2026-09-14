import type { Experiment } from '../types/experiment';
import type { CardTier, InventionCard } from '../types/card';
import { DAILY_CARD_THRESHOLD } from '../constants/generation';
import { localDateKey } from './date';
import type { InventionMachineState } from '../types/card';
import { CARD_NAME_POOLS, GENERIC_CARD_NAMES } from '../constants/cardNames';

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

function hashStr(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function summarizeTasks(tasks: string[]): { title: string; description: string } {
  if (!tasks.length) return GENERIC_CARD_NAMES[0];

  const allText = tasks.join(' ');
  // 按匹配权重排序：命中越多种关键词的池优先
  const scored = CARD_NAME_POOLS.map((pool) => {
    const score = pool.match.filter((kw) => allText.includes(kw)).length;
    return { pool, score };
  }).sort((a, b) => b.score - a.score);

  // 选匹配度最高的池（至少命中 1 个关键词）
  const best = scored.find((s) => s.score > 0);
  if (best) {
    const idx = hashStr(allText) % best.pool.names.length;
    return best.pool.names[idx];
  }

  // 无匹配时的通用标题
  return GENERIC_CARD_NAMES[hashStr(allText) % GENERIC_CARD_NAMES.length];
}

function generateId() {
  return crypto.randomUUID();
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

/**
 * 门槛检查：完成数不足 5 时返回 null（调用方据 remainingTasksForCard 提示差额）。
 * 注意：这里只负责"卡牌结构"（来源/时间由程序填），名称与描述由 AI 文案模块异步生成，
 * 失败时由 aiCopy 层降级到本地模板，因此本函数只返回结构占位所需的完成列表。
 */
export function generateCardFromTasks(
  tasks: Experiment[],
  date = new Date(),
  /** 已有卡牌历史。材质等级由连续研究天数决定，不传就只能算成第 1 天。 */
  existingCards: { dailyKey: string }[] = [],
): InventionCard | null {
  const completedTasks = tasks.filter((t) => t.completed).map((t) => t.name);
  if (completedTasks.length < DAILY_CARD_THRESHOLD) return null;

  // 这张卡就是今天的：先把它并入日常序列再数连续天数，否则永远少算今天这一天。
  const streak = calcStreak([...existingCards, { dailyKey: localDateKey(date) }]);

  // AI 不可用时仍维持荒诞发明物风格，避免收藏内容出现两套命名体系。
  const summary = summarizeTasks(completedTasks);
  const name = summary.title || '日常阻力消解器';
  const description = summary.description || '把今天的微小行动，编译成一场荒诞实验。';

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  return {
    id: generateId(),
    name,
    description,
    sourceTasks: completedTasks,
    earnedAt: date.toISOString(),
    dailyKey: localDateKey(date),
    imagePath: undefined,
    type: 'daily',
    stackKey: name,
    backTasks: completedTasks.map((t) => t.slice(0, 10)),
    date: dateStr,
    tier: getTier(streak),
  };
}
