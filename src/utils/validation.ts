import { TASK_ICONS, type Task } from '../types/task';
import type { InventionCard } from '../types/card';
import type { AppData } from '../types/storage';
import type { AppSettings } from '../types/settings';

export function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Record<string, unknown>;
  return typeof task.id === 'string' && typeof task.name === 'string'
    && TASK_ICONS.includes(task.icon as Task['icon']) && typeof task.minutes === 'number'
    && typeof task.completed === 'boolean' && typeof task.createdAt === 'string';
}

export function isCard(value: unknown): value is InventionCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  return typeof card.id === 'string' && typeof card.name === 'string'
    && typeof card.description === 'string' && Array.isArray(card.sourceTasks)
    && typeof card.earnedAt === 'string' && typeof card.stackKey === 'string'
    && typeof card.dailyKey === 'string';
}

/** 旧卡牌允许缺少 dailyKey；迁移时从有效的获得时间补齐。 */
export function normalizeCards(value: unknown): InventionCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const card = item as Record<string, unknown>;
    const earnedAt = typeof card.earnedAt === 'string' ? new Date(card.earnedAt) : null;
    const derived = earnedAt && !Number.isNaN(earnedAt.getTime())
      ? `${earnedAt.getFullYear()}-${String(earnedAt.getMonth() + 1).padStart(2, '0')}-${String(earnedAt.getDate()).padStart(2, '0')}`
      : '';
    const normalized = { ...card, dailyKey: typeof card.dailyKey === 'string' ? card.dailyKey : derived };
    return isCard(normalized) ? [normalized] : [];
  });
}

export function safeArray<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}

function isSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return typeof settings.panelOpacity === 'number' && !!settings.theme
    && typeof settings.theme === 'object';
}

/** 持久化边界逐项过滤，避免一个坏记录拖垮整个应用。 */
export function normalizeData(value: unknown, fallback: AppData): AppData {
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Partial<AppData>;
  const tasksByDate = Object.fromEntries(Object.entries(source.tasksByDate ?? {})
    .map(([date, tasks]) => [date, safeArray(tasks, isTask)]));
  return {
    ...fallback, schemaVersion: 1,
    revision: typeof source.revision === 'number' ? source.revision : 0,
    tasksByDate,
    cards: normalizeCards(source.cards),
    slimes: Array.isArray(source.slimes) ? source.slimes : [],
    settings: isSettings(source.settings) ? source.settings : fallback.settings,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : fallback.updatedAt,
    storageWarning: source.storageWarning,
  };
}
