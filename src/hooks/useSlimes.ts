import { useEffect } from 'react';
import { useAppData } from './useAppData';
import { elapsedDays } from '../utils/date';
import { useCurrentDate } from './useCurrentDate';
import type { SlimeCompanion } from '../types/slime';

export function useSlimes(): SlimeCompanion {
  const { now, dateKey } = useCurrentDate();
  const { data, ready, update } = useAppData();
  useEffect(() => {
    if (!ready) return;
    const allTasks = Object.values(data.tasksByDate).flat();
    const active = new Set(allTasks.filter((task) => !task.completed).map((task) => task.id));
    const existing = new Set(data.slimes.map((meal) => meal.taskId));
    const additions = Object.entries(data.tasksByDate).flatMap(([date, tasks]) => {
      if (date >= dateKey) return [];
      return tasks.filter((task) => !task.completed && !existing.has(task.id))
        .map((task) => ({ taskId: task.id, swallowedAt: now.toISOString() }));
    });
    const hasDigested = data.slimes.some((meal) => !active.has(meal.taskId));
    if (additions.length || hasDigested) void update((current) => {
      const known = new Set(current.slimes.map((meal) => meal.taskId));
      return {
        ...current,
        slimes: [...current.slimes.filter((meal) => active.has(meal.taskId)),
          ...additions.filter((meal) => !known.has(meal.taskId))],
      };
    }).catch(() => undefined);
  }, [data.slimes, data.tasksByDate, now, dateKey, ready, update]);

  const indexed = new Map(Object.entries(data.tasksByDate).flatMap(([taskDate, tasks]) =>
    tasks.map((task) => [task.id, { task, taskDate }] as const)));
  const meals = data.slimes.flatMap((meal) => {
    const source = indexed.get(meal.taskId);
    return source && !source.task.completed ? [{ ...meal, taskName: source.task.name,
      taskDate: source.taskDate, wanderingDays: elapsedDays(meal.swallowedAt, now) }] : [];
  });
  return { meals, mood: meals.length === 0 ? 'light' : meals.length < 4 ? 'content' : 'full' };
}
