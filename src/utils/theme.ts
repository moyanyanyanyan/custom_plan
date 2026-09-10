import type { AppSettings } from '../types/settings';
import { loadAsset } from './appRepository';

const variables: Record<keyof AppSettings['theme'], string> = {
  primary: '--theme-primary',
  secondary: '--theme-secondary',
  accent: '--theme-accent',
  completed: '--theme-completed',
  pending: '--theme-pending',
  text: '--theme-text',
  cardHighlight: '--theme-card-highlight',
  slimeTint: '--theme-slime',
};

export async function applyTheme(settings: AppSettings): Promise<void> {
  const root = document.documentElement;
  Object.entries(settings.theme).forEach(([key, value]) => {
    root.style.setProperty(variables[key as keyof AppSettings['theme']], value);
  });
  root.style.setProperty('--panel-opacity', String(settings.panelOpacity));
  const wallpaper = settings.wallpaperAssetId
    ? await loadAsset(settings.wallpaperAssetId).catch(() => '') : '';
  root.style.setProperty('--panel-wallpaper', wallpaper ? `url("${wallpaper}")` : 'none');
}
