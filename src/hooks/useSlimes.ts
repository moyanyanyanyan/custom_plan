import { useEffect } from 'react';
import { useAppData } from './useAppData';
import { elapsedDays } from '../utils/date';
import { useCurrentDate } from './useCurrentDate';

export function useSlimes() {
  const { now, dateKey } = useCurrentDate();
  const { data, ready, update } = useAppData();
  useEffect(() => {
    if (!ready) return;
    const existing = new Set(data.slimes.map((slime) => slime.sourceTaskId));
    const allTasks = Object.values(data.tasksByDate).flat();
    const completed = new Set(allTasks.filter((task) => task.completed).map((task) => task.id));
    const additions = Object.entries(data.tasksByDate).flatMap(([date, tasks]) => {
      if (date >= dateKey) return [];
      return tasks.filter((task) => !task.completed && !existing.has(task.id)).map((task) => ({
        id: `slime-${task.id}`, sourceTaskId: task.id, sourceTaskName: task.name,
        name: '明天再说史莱姆', description: `由“${task.name}”的停滞能量形成。`,
        discoveredAt: now.toISOString(), containedAt: null,
      }));
    });
    const needsContainment = data.slimes.some((slime) => !slime.containedAt && completed.has(slime.sourceTaskId));
    if (additions.length || needsContainment) void update((current) => {
      const known = new Set(current.slimes.map((slime) => slime.sourceTaskId));
      return {
        ...current,
        slimes: [...current.slimes.map((slime) =>
          !slime.containedAt && completed.has(slime.sourceTaskId)
            ? { ...slime, containedAt: now.toISOString() } : slime),
        ...additions.filter((slime) => !known.has(slime.sourceTaskId))],
      };
    }).catch(() => undefined);
  }, [data.slimes, data.tasksByDate, now, dateKey, ready, update]);

  return data.slimes.map((slime) => ({
    ...slime,
    wanderingDays: elapsedDays(slime.discoveredAt,
      slime.containedAt ? new Date(slime.containedAt) : now),
  }));
}
