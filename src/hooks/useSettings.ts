import { useCallback } from 'react';
import type { AppSettings } from '../types/settings';
import { useAppData } from './useAppData';

export function useSettings() {
  const { data, update } = useAppData();
  const save = useCallback((settings: AppSettings) =>
    update((current) => ({ ...current, settings })), [update]);
  return { settings: data.settings, save };
}
