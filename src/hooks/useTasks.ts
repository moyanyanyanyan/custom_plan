import { useCallback } from 'react';
import { useAppData } from './useAppData';
import { useCurrentDate } from './useCurrentDate';
import type { ScheduledTask, Task, TaskDraft } from '../types/task';
import { createTask } from '../utils/taskModel';
import { moveReminder, nextRepeatDate } from '../utils/taskSchedule';

/** 今日任务状态与操作的统一入口；界面只通过它读写数据层。 */
export function useTasks() {
  const { data, update } = useAppData();
  const { dateKey } = useCurrentDate();
  const tasks = data.tasksByDate[dateKey] ?? [];
  const laterTasks: ScheduledTask[] = Object.entries(data.tasksByDate)
    .filter(([date]) => date > dateKey)
    .flatMap(([date, entries]) => entries.map((task) => ({ task, dateKey: date })))
    .sort((a, b) => `${a.dateKey}${a.task.scheduledTime ?? ''}`
      .localeCompare(`${b.dateKey}${b.task.scheduledTime ?? ''}`));
  const add = useCallback((draft: TaskDraft) => {
    const now = new Date();
    const task = createTask({ id: crypto.randomUUID(), name: draft.title.trim(), icon: 'flask',
      minutes: 10, completed: false, group: 'A', scheduledTime: draft.time,
      reminderAt: draft.reminderAt, repeatRule: draft.repeatRule,
      seriesId: draft.repeatRule ? crypto.randomUUID() : null, steps: draft.steps }, now);
    void update((current) => ({
      ...current, tasksByDate: {
        ...current.tasksByDate,
        [draft.targetDate]: [...(current.tasksByDate[draft.targetDate] ?? []), task],
      },
    })).catch(() => undefined);
    return task.id;
  }, [update]);
  const toggle = useCallback((taskDate: string, id: string) => {
    const now = new Date();
    const nextId = crypto.randomUUID();
    void update((current) => {
      const source = (current.tasksByDate[taskDate] ?? []).find((task) => task.id === id);
      if (!source) return current;
      const completing = !source.completed;
      const tasksByDate = { ...current.tasksByDate,
        [taskDate]: (current.tasksByDate[taskDate] ?? []).map((task) => task.id === id
          ? { ...task, completed: completing, completedAt: completing ? now.toISOString() : null } : task) };
      if (completing && source.repeatRule) {
        const nextDate = nextRepeatDate(taskDate, source.repeatRule);
        const seriesId = source.seriesId ?? source.id;
        const exists = (tasksByDate[nextDate] ?? []).some((task) => task.seriesId === seriesId);
        if (!exists) tasksByDate[nextDate] = [...(tasksByDate[nextDate] ?? []), createTask({
          ...source, id: nextId, completed: false, completedAt: null, remindedAt: null, seriesId,
          reminderAt: moveReminder(source.reminderAt, taskDate, nextDate),
          steps: source.steps.map((step) => ({ ...step, completed: false })),
        }, now)];
      }
      return { ...current, tasksByDate };
    }).catch(() => undefined);
  }, [update]);
  const remove = useCallback((taskDate: string, id: string) => {
    void update((current) => ({ ...current, tasksByDate: {
      ...current.tasksByDate, [taskDate]: (current.tasksByDate[taskDate] ?? []).filter((task) => task.id !== id),
    } })).catch(() => undefined);
  }, [update]);
  const patch = useCallback((taskDate: string, id: string, changes: Partial<Task>) => {
    void update((current) => ({ ...current, tasksByDate: { ...current.tasksByDate,
      [taskDate]: (current.tasksByDate[taskDate] ?? []).map((task) =>
        task.id === id ? { ...task, ...changes } : task) } })).catch(() => undefined);
  }, [update]);
  const moveToToday = useCallback((from: string, id: string) => {
    void update((current) => {
      const task = (current.tasksByDate[from] ?? []).find((item) => item.id === id);
      if (!task) return current;
      return { ...current, tasksByDate: { ...current.tasksByDate,
        [from]: (current.tasksByDate[from] ?? []).filter((item) => item.id !== id),
        [dateKey]: [...(current.tasksByDate[dateKey] ?? []), { ...task,
          reminderAt: moveReminder(task.reminderAt, from, dateKey), remindedAt: null }] } };
    }).catch(() => undefined);
  }, [dateKey, update]);
  const reschedule = useCallback((from: string, to: string, id: string, changes: Partial<Task> = {}) => {
    void update((current) => {
      const task = (current.tasksByDate[from] ?? []).find((item) => item.id === id);
      if (!task) return current;
      const moved = { ...task, ...changes,
        reminderAt: changes.reminderAt === undefined ? moveReminder(task.reminderAt, from, to) : changes.reminderAt,
        remindedAt: null };
      if (from === to) return { ...current, tasksByDate: { ...current.tasksByDate,
        [from]: (current.tasksByDate[from] ?? []).map((item) => item.id === id ? moved : item) } };
      return { ...current, tasksByDate: { ...current.tasksByDate,
        [from]: (current.tasksByDate[from] ?? []).filter((item) => item.id !== id),
        [to]: [...(current.tasksByDate[to] ?? []), moved] } };
    }).catch(() => undefined);
  }, [update]);
  const completeHistorical = useCallback((id: string) => {
    const completedAt = new Date().toISOString();
    void update((current) => ({ ...current, tasksByDate: Object.fromEntries(
      Object.entries(current.tasksByDate).map(([date, entries]) => [date,
        entries.map((task) => task.id === id
          ? { ...task, completed: true, completedAt } : task)]),
    ) })).catch(() => undefined);
  }, [update]);
  const discardHistorical = useCallback((id: string) => {
    void update((current) => ({ ...current,
      tasksByDate: Object.fromEntries(Object.entries(current.tasksByDate).map(([date, entries]) =>
        [date, entries.filter((task) => task.id !== id)])),
      slimes: current.slimes.filter((meal) => meal.taskId !== id),
    })).catch(() => undefined);
  }, [update]);
  return { tasks, laterTasks, dateKey, add, toggle, remove, patch, reschedule,
    moveToToday, completeHistorical, discardHistorical };
}
