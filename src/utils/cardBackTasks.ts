import type { InventionCard } from '../types/card';
import type { Task } from '../types/task';

/** 与 cardGenerator 生成卡背时保持一致：每个任务名截断到 10 字。 */
export const BACK_TASK_LIMIT = 10;

/** 某一天「已完成」任务在卡背上的显示名（顺序沿用任务列表顺序）。 */
export function completedTaskLabels(tasks: Task[] | undefined): string[] {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .filter((task) => task.completed)
    .map((task) => task.name.slice(0, BACK_TASK_LIMIT));
}

/** 卡背最终展示的任务列表 = 生成时的快照 ∪ 该日期后续新完成的任务（去重，快照顺序优先）。
 *
 *  卡背的 backTasks 是「生成卡牌那一刻」拍下的快照（见 cardGenerator），生成之后任务还会继续
 *  完成，但没有任何代码回头更新它。这里在渲染时补齐：只要当天还有新完成的任务，就会出现在
 *  卡背里，保证「背面展示当天完成的任务列表」这条规则在任何时候都成立，也不需要迁移旧数据。
 *  已完成又被取消勾选的任务会保留在快照里（卡牌记录的是当天发生过的事）。 */
export function mergeBackTasks(card: InventionCard, tasksForDate: Task[] | undefined): string[] {
  const snapshot = Array.isArray(card.backTasks) ? card.backTasks : [];
  const later = completedTaskLabels(tasksForDate);
  if (later.length === 0) return snapshot;

  // 按「出现次数」补足，而不是按名字去重：同名任务（比如一天做了 7 次「吃饭」）每完成一次
  // 都该在卡背多出一条。快照里已有的同名条目先抵消掉，剩下的才是新增。
  const remaining = new Map<string, number>();
  for (const label of snapshot) {
    remaining.set(label, (remaining.get(label) ?? 0) + 1);
  }

  const merged = [...snapshot];
  for (const label of later) {
    const already = remaining.get(label) ?? 0;
    if (already > 0) {
      remaining.set(label, already - 1);
      continue;
    }
    merged.push(label);
  }
  return merged;
}
