import { useEffect, useState, type ChangeEvent } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../constants/generation';
import { useSettings } from '../../hooks/useSettings';
import type { AppSettings, ThemeSettings } from '../../types/settings';
import { extractTheme, validateImageDimensions } from '../../utils/colorExtraction';
import { saveUserAsset } from '../../utils/appRepository';
import { applyTheme } from '../../utils/theme';
import './settings.css';

const labels: Record<keyof ThemeSettings, string> = {
  primary: '主背景', secondary: '副背景', accent: '强调色', completed: '完成色',
  pending: '待办色', text: '文字色', cardHighlight: '卡牌高光', slimeTint: '史莱姆',
};

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [error, setError] = useState('');
  useEffect(() => { if (open) setDraft(settings); }, [open, settings]);
  useEffect(() => {
    if (!open) return;
    void applyTheme(draft);
    return () => { void applyTheme(settings); };
  }, [draft, open, settings]);
  if (!open) return null;

  const importImage = async (event: ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'wallpaper') => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError('仅支持 8MB 内的 PNG、JPEG 或 WebP 图片');
      return;
    }
    setError('');
    try {
      const preview = URL.createObjectURL(file);
      await validateImageDimensions(preview);
      const theme = kind === 'avatar' ? await extractTheme(preview) : draft.theme;
      URL.revokeObjectURL(preview);
      const assetId = await saveUserAsset(file, kind);
      setDraft((current) => ({
        ...current, theme,
        avatarAssetId: kind === 'avatar' ? assetId : current.avatarAssetId,
        wallpaperAssetId: kind === 'wallpaper' ? assetId : current.wallpaperAssetId,
      }));
    } catch (reason) { setError(String(reason)); }
  };

  return <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="研究所设置">
    <section className="settings-panel">
      <header><div><span>LAB SETTINGS</span><h2>研究所设置</h2></div>
        <button onClick={onClose} aria-label="关闭设置">×</button></header>
      <div className="asset-settings">
        <label>助手头像<input type="file" accept="image/png,image/jpeg,image/webp"
          onChange={(event) => void importImage(event, 'avatar')} /></label>
        <label>面板壁纸<input type="file" accept="image/png,image/jpeg,image/webp"
          onChange={(event) => void importImage(event, 'wallpaper')} /></label>
      </div>
      <label className="opacity-setting">面板透明度
        <input type="range" min="0.4" max="1" step="0.02" value={draft.panelOpacity}
          onChange={(event) => setDraft({ ...draft, panelOpacity: Number(event.target.value) })} />
        <output>{Math.round(draft.panelOpacity * 100)}%</output>
      </label>
      <div className="theme-grid">{Object.entries(labels).map(([key, label]) =>
        <label key={key}>{label}<input type="color" value={draft.theme[key as keyof ThemeSettings]}
          onChange={(event) => setDraft({ ...draft, theme: {
            ...draft.theme, [key]: event.target.value,
          } })} /></label>)}</div>
      {error && <p role="alert">{error}</p>}
      <footer><button onClick={() => { setDraft(settings); onClose(); }}>取消</button>
        <button className="settings-save" onClick={() => { save(draft); onClose(); }}>应用设置</button></footer>
    </section>
  </div>;
}
