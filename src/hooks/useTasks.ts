import { useCallback } from 'react';
import type { ExperimentSeed } from '../types/experiment';
import { useAppData } from './useAppData';
import { useCurrentDate } from './useCurrentDate';

/** 今日任务状态与操作的统一入口；界面只通过它读写数据层。 */
export function useTasks() {
  const { data, update } = useAppData();
  const { dateKey } = useCurrentDate();
  const tasks = data.tasksByDate[dateKey] ?? [];
  const add = useCallback((template: Omit<ExperimentSeed, 'id'>) => {
    const now = new Date();
    const task = {
      ...template, id: crypto.randomUUID(), createdAt: now.toISOString(), completedAt: null,
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
  return { tasks, add, toggle, remove };
}
