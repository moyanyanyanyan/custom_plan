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

let applicationVersion = 0;

function colorMix(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

export async function applyTheme(settings: AppSettings): Promise<void> {
  const version = ++applicationVersion;
  const root = document.documentElement;
  Object.entries(settings.theme).forEach(([key, value]) => {
    root.style.setProperty(variables[key as keyof AppSettings['theme']], value);
  });
  root.style.setProperty('--panel-opacity', String(settings.panelOpacity));
  root.style.setProperty('--theme-muted-text', colorMix(settings.theme.text, 0.7));
  root.style.setProperty('--theme-border', colorMix(settings.theme.accent, 0.3));
  root.style.setProperty('--theme-soft-surface', colorMix(settings.theme.secondary, 0.42));
  const wallpaper = settings.wallpaperAssetId
    ? await loadAsset(settings.wallpaperAssetId).catch(() => '') : '';
  if (version !== applicationVersion) return;
  root.style.setProperty('--panel-wallpaper', wallpaper ? `url("${wallpaper}")` : 'none');
  const overlay = wallpaper ? 0.25 + settings.panelOpacity * 0.45 : settings.panelOpacity;
  root.style.setProperty('--panel-overlay-opacity', String(overlay));
}
