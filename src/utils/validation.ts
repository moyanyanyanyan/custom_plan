import type { Task } from '../types/task';
import type { InventionCard } from '../types/card';
import { CARD_TIERS } from '../types/card';
import type { AppData } from '../types/storage';
import type { AppSettings } from '../types/settings';
import { normalizeTask } from './taskModel';
import type { SlimeMeal } from '../types/slime';

export function isTask(value: unknown): value is Task {
  return normalizeTask(value) !== null;
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
    // 旧卡没有材质等级：补 copper，避免卡面渲染出 tier-undefined。
    const tier = typeof card.tier === 'string' && (CARD_TIERS as readonly string[]).includes(card.tier)
      ? (card.tier as InventionCard['tier'])
      : 'copper';
    const normalized = {
      ...card,
      dailyKey: typeof card.dailyKey === 'string' ? card.dailyKey : derived,
      tier,
    };
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

function normalizeSettings(value: unknown, fallback: AppSettings): AppSettings {
  if (!isSettings(value)) return fallback;
  return {
    ...fallback, ...value,
    panelMode: value.panelMode === 'compact' ? 'compact' : 'standard',
    username: typeof value.username === 'string' && value.username.trim() ? value.username.trim() : fallback.username,
    soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : true,
    stepfunApiKey: typeof value.stepfunApiKey === 'string' ? value.stepfunApiKey : fallback.stepfunApiKey,
    theme: { ...fallback.theme, ...value.theme },
  };
}

/** 旧版每项任务一只史莱姆，迁移后只保留任务引用与吞入时间。 */
function normalizeSlimeMeals(value: unknown): SlimeMeal[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Record<string, unknown>;
    const taskId = typeof source.taskId === 'string' ? source.taskId
      : typeof source.sourceTaskId === 'string' ? source.sourceTaskId : '';
    const swallowedAt = typeof source.swallowedAt === 'string' ? source.swallowedAt
      : typeof source.discoveredAt === 'string' ? source.discoveredAt : '';
    if (!taskId || !swallowedAt || source.containedAt || seen.has(taskId)) return [];
    seen.add(taskId);
    return [{ taskId, swallowedAt }];
  });
}

/** 持久化边界逐项过滤，避免一个坏记录拖垮整个应用。 */
export function normalizeData(value: unknown, fallback: AppData): AppData {
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Partial<AppData>;
  const tasksByDate = Object.fromEntries(Object.entries(source.tasksByDate ?? {})
    .map(([date, tasks]) => [date, Array.isArray(tasks)
      ? tasks.flatMap((task) => { const normalized = normalizeTask(task); return normalized ? [normalized] : []; }) : []]));
  return {
    ...fallback, schemaVersion: 2,
    revision: typeof source.revision === 'number' ? source.revision : 0,
    tasksByDate,
    cards: normalizeCards(source.cards),
    slimes: normalizeSlimeMeals(source.slimes),
    settings: normalizeSettings(source.settings, fallback.settings),
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : fallback.updatedAt,
    storageWarning: source.storageWarning,
  };
}
