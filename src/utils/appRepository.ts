import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { experiments } from '../constants/preview';
import { createDefaultData } from '../constants/defaults';
import type { AppData, LegacyData } from '../types/storage';
import { isCard, isTask, normalizeData, safeArray } from './validation';
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
    return safeArray(value.cards, isCard);
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

export async function saveAppData(data: AppData): Promise<void> {
  if (isDesktop) {
    await invoke('save_app_data', { data });
    await emit('app-data-changed', data);
    return;
  }
  localStorage.setItem(WEB_STATE_KEY, JSON.stringify(data));
}

export async function listenForAppData(handler: (data: AppData) => void): Promise<UnlistenFn> {
  if (!isDesktop) return () => undefined;
  return listen<AppData>('app-data-changed', (event) => handler(event.payload));
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
