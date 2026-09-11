import { TASK_ICONS, type RepeatRule, type Task, type TaskSeed, type TaskStep } from '../types/task';

const repeatRules: RepeatRule[] = ['daily', 'weekly', 'weekdays'];

export function createTask(seed: TaskSeed, now = new Date()): Task {
  return {
    id: seed.id, name: seed.name, icon: seed.icon, minutes: seed.minutes,
    completed: seed.completed, group: seed.group,
    createdAt: seed.createdAt ?? now.toISOString(),
    completedAt: seed.completedAt ?? (seed.completed ? now.toISOString() : null),
    scheduledTime: seed.scheduledTime ?? null,
    reminderAt: seed.reminderAt ?? null,
    remindedAt: seed.remindedAt ?? null,
    repeatRule: seed.repeatRule ?? null,
    seriesId: seed.seriesId ?? null,
    notes: seed.notes ?? '', steps: seed.steps ?? [],
  };
}

function normalizeSteps(value: unknown): TaskStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const step = item as Record<string, unknown>;
    return typeof step.id === 'string' && typeof step.title === 'string'
      ? [{ id: step.id, title: step.title, completed: step.completed === true }] : [];
  });
}

/** 迁移时逐字段修复，扩展字段异常不能让旧任务消失。 */
export function normalizeTask(value: unknown): Task | null {
  if (!value || typeof value !== 'object') return null;
  const task = value as Record<string, unknown>;
  if (typeof task.id !== 'string' || typeof task.name !== 'string'
    || !TASK_ICONS.includes(task.icon as Task['icon']) || typeof task.minutes !== 'number'
    || typeof task.completed !== 'boolean' || typeof task.createdAt !== 'string') return null;
  const repeatRule = repeatRules.includes(task.repeatRule as RepeatRule)
    ? task.repeatRule as RepeatRule : null;
  return createTask({
    id: task.id, name: task.name, icon: task.icon as Task['icon'], minutes: task.minutes,
    completed: task.completed, group: typeof task.group === 'string' ? task.group : 'A',
    createdAt: task.createdAt,
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
    scheduledTime: typeof task.scheduledTime === 'string' ? task.scheduledTime : null,
    reminderAt: typeof task.reminderAt === 'string' ? task.reminderAt : null,
    remindedAt: typeof task.remindedAt === 'string' ? task.remindedAt : null,
    repeatRule, seriesId: typeof task.seriesId === 'string' ? task.seriesId : null,
    notes: typeof task.notes === 'string' ? task.notes : '', steps: normalizeSteps(task.steps),
  });
}
