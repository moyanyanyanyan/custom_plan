import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { experiments } from '../constants/preview';
import { createDefaultData } from '../constants/defaults';
import type { AppData, AppDataEvent, LegacyData } from '../types/storage';
import type { InventionCard } from '../types/card';
import { isTask, normalizeCards, normalizeData, safeArray } from './validation';
import { isDesktop } from './desktop';
import { localDateKey } from './date';

const WEB_STATE_KEY = 'absurd.app-data.v1';
const CARD_KEY = 'hackathon-card-collection';
const DEMO_CARD_KEY = 'hackathon-card-collection-demo';

function seededDefaults(now = new Date()): AppData {
  const data = createDefaultData(now);
  const timestamp = now.toISOString();
  data.tasksByDate[localDateKey(now)] = experiments.map((task) => ({
    ...task, createdAt: timestamp, completedAt: task.completed ? timestamp : null,
  }));
  return data;
}

function parseCards(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}') as { cards?: unknown };
    return normalizeCards(value.cards);
  } catch { return []; }
}

/** 旧格式只在迁移边界读取，业务组件永远不接触 localStorage。 */
function readLegacy(): LegacyData {
  const tasksByDate: LegacyData['tasksByDate'] = {};
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith('absurd.tasks.')) continue;
      const date = key.slice('absurd.tasks.'.length);
      tasksByDate[date] = safeArray(JSON.parse(localStorage.getItem(key) || '[]'), isTask);
    }
  } catch { /* 损坏的旧记录不会阻止其他数据迁移。 */ }
  return { tasksByDate, cards: parseCards(CARD_KEY), demoCards: parseCards(DEMO_CARD_KEY) };
}

function mergeLegacy(defaults: AppData, legacy: LegacyData): AppData {
  const hasTasks = Object.keys(legacy.tasksByDate).length > 0;
  return {
    ...defaults,
    tasksByDate: hasTasks ? legacy.tasksByDate : defaults.tasksByDate,
    cards: [...legacy.cards, ...legacy.demoCards],
  };
}

export async function loadAppData(): Promise<AppData> {
  const defaults = seededDefaults();
  if (isDesktop) {
    const current = await invoke<AppData>('load_app_data');
    if (current.schemaVersion === 1) return normalizeData(current, defaults);
    return invoke<AppData>('import_legacy_data', { legacy: readLegacy(), defaults });
  }
  try {
    const saved = localStorage.getItem(WEB_STATE_KEY);
    if (saved) return normalizeData(JSON.parse(saved), defaults);
  } catch { /* 浏览器预览回退到经过校验的旧数据。 */ }
  const migrated = mergeLegacy(defaults, readLegacy());
  localStorage.setItem(WEB_STATE_KEY, JSON.stringify(migrated));
  return migrated;
}

export async function saveAppData(data: AppData, expectedRevision: number, sourceId: string): Promise<AppData> {
  if (isDesktop) {
    return invoke<AppData>('save_app_data', { data, expectedRevision, sourceId });
  }
  const current = await loadAppData();
  if (current.revision !== expectedRevision) throw new Error('STATE_CONFLICT');
  const saved = { ...data, revision: expectedRevision + 1 };
  localStorage.setItem(WEB_STATE_KEY, JSON.stringify(saved));
  return saved;
}

export async function listenForAppData(handler: (event: AppDataEvent) => void): Promise<UnlistenFn> {
  if (isDesktop) return listen<AppDataEvent>('app-data-changed', (event) => handler(event.payload));
  const onStorage = (event: StorageEvent) => {
    if (event.key !== WEB_STATE_KEY || !event.newValue) return;
    try { handler({ sourceId: 'browser', data: JSON.parse(event.newValue) as AppData }); } catch { /* 忽略损坏事件。 */ }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export async function claimDailyCard(dateKey: string, card: InventionCard, sourceId: string) {
  if (isDesktop) return invoke<AppData>('claim_daily_card', { dateKey, card, sourceId });
  const current = await loadAppData();
  if (current.cards.some((item) => item.dailyKey === dateKey)) throw new Error('DAILY_CARD_EXISTS');
  return saveAppData({ ...current, cards: [...current.cards, card] }, current.revision, sourceId);
}

export async function updateStoredCard(cardId: string, patch: Partial<InventionCard>, sourceId: string) {
  if (isDesktop) return invoke<AppData>('update_card', { cardId, patch, sourceId });
  const current = await loadAppData();
  const cards = current.cards.map((card) => card.id === cardId ? { ...card, ...patch } : card);
  return saveAppData({ ...current, cards }, current.revision, sourceId);
}

export async function loadAsset(assetId: string): Promise<string> {
  if (assetId.startsWith('data:') || assetId.startsWith('/')) return assetId;
  return isDesktop ? invoke<string>('load_asset_data_url', { assetId }) : '';
}

export async function saveUserAsset(file: File, kind: 'avatar' | 'wallpaper'): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
  if (!isDesktop) return dataUrl;
  const assetId = `${kind}-${Date.now().toString(36)}`;
  return invoke<string>('save_user_asset', { assetId, dataUrl });
}
