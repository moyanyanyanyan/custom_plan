import { useCallback } from 'react';
import { useAppData } from './useAppData';
import { useCurrentDate } from './useCurrentDate';

/** 今日任务状态与操作的统一入口；界面只通过它读写数据层。 */
export function useTasks() {
  const { data, update } = useAppData();
  const { dateKey } = useCurrentDate();
  const tasks = data.tasksByDate[dateKey] ?? [];
  const add = useCallback((name: string) => {
    const now = new Date();
    const task = {
      id: crypto.randomUUID(), name: name.trim(), icon: 'flask' as const, minutes: 10,
      completed: false, group: 'A', createdAt: now.toISOString(), completedAt: null,
    };
    update((current) => ({
      ...current, tasksByDate: {
        ...current.tasksByDate, [dateKey]: [...(current.tasksByDate[dateKey] ?? []), task],
      },
    }));
  }, [dateKey, update]);
  const toggle = useCallback((id: string) => {
    const now = new Date();
    update((current) => ({ ...current, tasksByDate: {
      ...current.tasksByDate,
      [dateKey]: (current.tasksByDate[dateKey] ?? []).map((task) => task.id === id
        ? { ...task, completed: !task.completed, completedAt: task.completed ? null : now.toISOString() }
        : task),
    } }));
  }, [dateKey, update]);
  const remove = useCallback((id: string) => {
    update((current) => ({ ...current, tasksByDate: {
      ...current.tasksByDate, [dateKey]: (current.tasksByDate[dateKey] ?? []).filter((task) => task.id !== id),
    } }));
  }, [dateKey, update]);
  const completeHistorical = useCallback((id: string) => {
    const completedAt = new Date().toISOString();
    update((current) => ({ ...current, tasksByDate: Object.fromEntries(
      Object.entries(current.tasksByDate).map(([date, entries]) => [date,
        entries.map((task) => task.id === id
          ? { ...task, completed: true, completedAt } : task)]),
    ) }));
  }, [update]);
  return { tasks, add, toggle, remove, completeHistorical };
}
