import { DEFAULT_THEME } from './theme';
import type { AppData } from '../types/storage';

export function createDefaultData(now = new Date()): AppData {
  return {
    schemaVersion: 1, tasksByDate: {}, cards: [], slimes: [],
    settings: { avatarAssetId: null, wallpaperAssetId: null, panelOpacity: 0.96, theme: DEFAULT_THEME },
    updatedAt: now.toISOString(),
  };
}
