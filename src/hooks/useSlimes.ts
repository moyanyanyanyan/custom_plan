import { useEffect, useMemo } from 'react';
import { useAppData } from './useAppData';
import { elapsedDays, localDateKey } from '../utils/date';

export function useSlimes() {
  const now = useMemo(() => new Date(), []);
  const { data, ready, update } = useAppData();
  useEffect(() => {
    if (!ready) return;
    const existing = new Set(data.slimes.map((slime) => slime.sourceTaskId));
    const allTasks = Object.values(data.tasksByDate).flat();
    const completed = new Set(allTasks.filter((task) => task.completed).map((task) => task.id));
    const additions = Object.entries(data.tasksByDate).flatMap(([date, tasks]) => {
      if (date >= localDateKey(now)) return [];
      return tasks.filter((task) => !task.completed && !existing.has(task.id)).map((task) => ({
        id: `slime-${task.id}`, sourceTaskId: task.id, sourceTaskName: task.name,
        name: '明天再说史莱姆', description: `由“${task.name}”的停滞能量形成。`,
        discoveredAt: now.toISOString(), containedAt: null,
      }));
    });
    const needsContainment = data.slimes.some((slime) => !slime.containedAt && completed.has(slime.sourceTaskId));
    if (additions.length || needsContainment) update((current) => ({
      ...current,
      slimes: [...current.slimes.map((slime) =>
        !slime.containedAt && completed.has(slime.sourceTaskId)
          ? { ...slime, containedAt: now.toISOString() } : slime), ...additions],
    }));
  }, [data.slimes, data.tasksByDate, now, ready, update]);

  return data.slimes.map((slime) => ({
    ...slime,
    wanderingDays: slime.containedAt ? 0 : elapsedDays(slime.discoveredAt, now),
  }));
}
