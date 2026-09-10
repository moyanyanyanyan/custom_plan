import type { Experiment } from '../types/experiment';
import type { InventionCard } from '../types/card';

const DAILY_THRESHOLD = 5; // 需求：完成 5 个任务才获得当日卡牌

function summarizeTasks(tasks: string[]): { title: string; description: string } {
  if (!tasks.length) return { title: '无用功粒子', description: '把今天的微小行动，编译成一场荒诞实验。' };
  const keywords = tasks.map((t) => t.replace(/[0-9.、\s]/g, '').slice(0, 4)).filter(Boolean);
  const title = keywords.slice(0, 3).join(' · ') || '今日微缩版';
  const description = `今日已完成 ${tasks.length} 项任务：${tasks.slice(0, 3).join('、')}${tasks.length > 3 ? ' 等' : ''}。`;
  return { title, description };
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 剩余所需任务数（>0 = 还没到门槛）。 */
export function remainingTasksForCard(tasks: { completed: boolean }[]): number {
  const done = tasks.filter((t) => t.completed).length;
  return Math.max(0, DAILY_THRESHOLD - done);
}

/**
 * 门槛检查：完成数不足 5 时返回 null（调用方据 remainingTasksForCard 提示差额）。
 * 注意：这里只负责"卡牌结构"（来源/时间由程序填），名称与描述由 AI 文案模块异步生成，
 * 失败时由 aiCopy 层降级到本地模板，因此本函数只返回结构占位所需的完成列表。
 */
export function generateCardFromTasks(tasks: Experiment[]): InventionCard | null {
  const completedTasks = tasks.filter((t) => t.completed).map((t) => t.name);
  if (completedTasks.length < DAILY_THRESHOLD) return null;

  // 本地降级命名：基于任务文本摘要出“当天总结/鼓励”式卡名与说明
  const summary = summarizeTasks(completedTasks);
  const name = summary.title || '无用功粒子';
  const description = summary.description || '把今天的微小行动，编译成一场荒诞实验。';

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const date = `${y}-${m}-${d}`;
  return {
    id: generateId(),
    name,
    description,
    sourceTasks: completedTasks,
    earnedAt: new Date().toISOString(),
    imagePath: undefined,
    type: 'daily',
    stackKey: name,
    backTasks: completedTasks.map((t) => t.slice(0, 10)),
    date,
  };
}
