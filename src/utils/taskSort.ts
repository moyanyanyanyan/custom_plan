import type { Task } from '../types/task';

/** 未完成优先；同状态按计划时间排序，并保持无时间任务稳定。 */
export function sortTasks<T extends Task>(tasks: T[]): T[] {
  return tasks.map((task, index) => ({ task, index })).sort((a, b) => {
    if (a.task.completed !== b.task.completed) return a.task.completed ? 1 : -1;
    const at = a.task.scheduledTime ?? '99:99';
    const bt = b.task.scheduledTime ?? '99:99';
    return at.localeCompare(bt) || a.index - b.index;
  }).map(({ task }) => task);
}
