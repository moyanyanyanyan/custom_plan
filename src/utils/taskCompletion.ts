import type { Task } from '../types/task';

/** 完成任务并移到列表末尾；已完成任务保持锁定，避免重复操作改变顺序。 */
export function completeTask(tasks: Task[], id: string, completedAt: string): Task[] {
  const source = tasks.find((task) => task.id === id);
  if (!source || source.completed) return tasks;
  return [...tasks.filter((task) => task.id !== id), { ...source, completed: true, completedAt }];
}
