import {
  EXPERIMENT_ICONS,
  type Experiment,
  type ExperimentIcon,
  type ExperimentSeed,
} from '../types/experiment';
import { experiments as seedTemplates } from '../constants/preview';
import { hasKey, loadJson, saveJson } from './storage';
import { createTask } from './taskModel';

/** 今日任务存储键：按天分桶，为“今日实验 / 连续研究天数 / 历史回顾”预留。 */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `tasks.${y}-${m}-${d}`;
}

/** 校验存储数据，避免坏数据进入界面。 */
function isExperiment(value: unknown): value is Experiment {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.icon === 'string' &&
    EXPERIMENT_ICONS.includes(v.icon as ExperimentIcon) &&
    typeof v.minutes === 'number' &&
    typeof v.completed === 'boolean' &&
    typeof v.group === 'string' &&
    typeof v.createdAt === 'string' &&
    (typeof v.completedAt === 'string' || v.completedAt === null)
  );
}

/** 首次运行：把默认任务模板写入今天的存储，返回完整任务列表。 */
function seedIfEmpty(date: Date): Experiment[] {
  const now = date.toISOString();
  const seeded: Experiment[] = seedTemplates.map((template) => createTask({ ...template,
    createdAt: now,
    completedAt: template.completed ? now : null,
  }, date));
  saveJson(todayKey(date), seeded);
  return seeded;
}

/** 读取今日任务；当天还没有数据时用默认任务播种。 */
export function loadToday(date = new Date()): Experiment[] {
  const key = todayKey(date);
  if (!hasKey(key)) return seedIfEmpty(date);
  return loadJson<Experiment[]>(key, []).filter(isExperiment);
}

/** 生成新任务 id：时间戳转 36 进制，前缀 t。 */
function nextId(date: Date): string {
  return `t${date.getTime().toString(36)}`;
}

/** 添加今日任务，返回更新后的任务列表。 */
export function addToday(template: Omit<ExperimentSeed, 'id'>, date = new Date()): Experiment[] {
  const task: Experiment = createTask({
    ...template,
    id: nextId(date),
    createdAt: date.toISOString(),
    completedAt: null,
  }, date);
  const next = [...loadToday(date), task];
  saveJson(todayKey(date), next);
  return next;
}

/** 切换今日任务的完成状态；完成/取消时同步写入完成时间。 */
export function toggleToday(id: string, date = new Date()): Experiment[] {
  const now = date.toISOString();
  const next = loadToday(date).map((task) =>
    task.id === id
      ? { ...task, completed: !task.completed, completedAt: task.completed ? null : now }
      : task,
  );
  saveJson(todayKey(date), next);
  return next;
}

/** 删除今日任务，返回剩余列表。 */
export function removeToday(id: string, date = new Date()): Experiment[] {
  const next = loadToday(date).filter((task) => task.id !== id);
  saveJson(todayKey(date), next);
  return next;
}
