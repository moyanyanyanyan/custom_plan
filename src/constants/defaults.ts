import { DEFAULT_THEME } from './theme';
import type { AppData } from '../types/storage';

export function createDefaultData(now = new Date()): AppData {
  return {
    schemaVersion: 1, revision: 0, tasksByDate: {}, cards: [], slimes: [],
    settings: {
      avatarAssetId: null, wallpaperAssetId: null, panelOpacity: 0.96,
      soundEnabled: true, theme: DEFAULT_THEME, stepfunApiKey: '',
    },
    updatedAt: now.toISOString(),
  };
}
