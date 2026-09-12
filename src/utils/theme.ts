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

interface ThemePreviewOptions {
  wallpaperSource?: string;
}

function colorMix(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

export async function applyTheme(
  settings: AppSettings,
  preview: ThemePreviewOptions = {},
): Promise<void> {
  const version = ++applicationVersion;
  const root = document.documentElement;
  Object.entries(settings.theme).forEach(([key, value]) => {
    root.style.setProperty(variables[key as keyof AppSettings['theme']], value);
  });
  root.style.setProperty('--panel-opacity', String(settings.panelOpacity));
  root.style.setProperty('--theme-muted-text', colorMix(settings.theme.text, 0.7));
  root.style.setProperty('--theme-border', colorMix(settings.theme.accent, 0.3));
  root.style.setProperty('--theme-soft-surface', colorMix(settings.theme.secondary, 0.42));
  let wallpaper = preview.wallpaperSource ?? '';
  let loadError: unknown;
  if (!wallpaper && settings.wallpaperAssetId) {
    try { wallpaper = await loadAsset(settings.wallpaperAssetId); }
    catch (reason) { loadError = reason; }
  }
  if (version !== applicationVersion) return;
  root.style.setProperty('--panel-wallpaper', wallpaper ? `url("${wallpaper}")` : 'none');
  root.style.setProperty('--panel-overlay-opacity', String(wallpaper ? settings.panelOpacity : 1));
  if (loadError) throw new Error(`壁纸读取失败：${String(loadError)}`);
}
