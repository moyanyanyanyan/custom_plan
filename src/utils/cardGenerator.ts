import type { Experiment } from '../types/experiment';
import type { InventionCard } from '../types/card';
import { DAILY_CARD_THRESHOLD } from '../constants/generation';
import { localDateKey } from './date';
import type { InventionMachineState } from '../types/card';

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
export function generateCardFromTasks(tasks: Experiment[], date = new Date()): InventionCard | null {
  const completedTasks = tasks.filter((t) => t.completed).map((t) => t.name);
  if (completedTasks.length < DAILY_CARD_THRESHOLD) return null;

  // 模板卡名固定（无 AI 时的降级体系）：同名即可跨天堆叠 → 收藏册可演示"分化"
  const name = '无用功粒子';
  const descriptions = [
    '把今天的微小行动，编译成一场荒诞实验。',
    '当"认真生活"被投入反应釜，会冒泡出一种不可思议的副产品。',
    '来自日常杂物的随机坍缩产物。',
    '记录了今日至少一项任务完成的奇点。',
  ];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  return {
    id: generateId(),
    name,
    description,
    sourceTasks: completedTasks,
    earnedAt: date.toISOString(),
    dailyKey: localDateKey(date),
    type: 'daily',
    stackKey: name,
  };
}
