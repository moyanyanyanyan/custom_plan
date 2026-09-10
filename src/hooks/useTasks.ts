import { useCallback } from 'react';
import type { ExperimentSeed } from '../types/experiment';
import { useAppData } from './useAppData';
import { localDateKey } from '../utils/date';

/** 今日任务状态与操作的统一入口；界面只通过它读写数据层。 */
export function useTasks() {
  const { data, update } = useAppData();
  const key = localDateKey();
  const tasks = data.tasksByDate[key] ?? [];
  const add = useCallback((template: Omit<ExperimentSeed, 'id'>) => {
    const now = new Date();
    const task = {
      ...template, id: crypto.randomUUID(), createdAt: now.toISOString(), completedAt: null,
    };
    update((current) => ({
      ...current, tasksByDate: {
        ...current.tasksByDate, [localDateKey(now)]: [...(current.tasksByDate[localDateKey(now)] ?? []), task],
      },
    }));
  }, [update]);
  const toggle = useCallback((id: string) => {
    const now = new Date();
    const dateKey = localDateKey(now);
    update((current) => ({ ...current, tasksByDate: {
      ...current.tasksByDate,
      [dateKey]: (current.tasksByDate[dateKey] ?? []).map((task) => task.id === id
        ? { ...task, completed: !task.completed, completedAt: task.completed ? null : now.toISOString() }
        : task),
    } }));
  }, [update]);
  const remove = useCallback((id: string) => {
    update((current) => ({ ...current, tasksByDate: {
      ...current.tasksByDate, [key]: (current.tasksByDate[key] ?? []).filter((task) => task.id !== id),
    } }));
  }, [key, update]);
  return { tasks, add, toggle, remove };
}
