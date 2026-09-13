import { DEFAULT_THEME } from './theme';
import type { AppData } from '../types/storage';

export function createDefaultData(now = new Date()): AppData {
  return {
    schemaVersion: 2, revision: 0, tasksByDate: {}, cards: [], slimes: [],
    settings: {
      panelMode: 'standard',
      username: '墨言',
      avatarAssetId: null, wallpaperAssetId: null, panelOpacity: 0.96,
      soundEnabled: true, theme: DEFAULT_THEME,
    },
    updatedAt: now.toISOString(),
  };
}
