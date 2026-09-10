import { useEffect, useState, type ChangeEvent } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../constants/generation';
import { createDefaultData } from '../../constants/defaults';
import { useSettings } from '../../hooks/useSettings';
import type { AppSettings, ThemeSettings } from '../../types/settings';
import { extractTheme, validateImageDimensions } from '../../utils/colorExtraction';
import { loadAsset, readUserAsset, saveUserAsset } from '../../utils/appRepository';
import { applyTheme } from '../../utils/theme';
import './settings.css';

const labels: Record<keyof ThemeSettings, string> = {
  primary: '主背景', secondary: '副背景', accent: '强调色', completed: '完成色',
  pending: '待办色', text: '文字色', cardHighlight: '卡牌高光', slimeTint: '史莱姆',
};

function AssetPreview({ assetId, label }: { assetId: string | null; label: string }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!assetId) { setSource(''); return; }
    void loadAsset(assetId).then((value) => { if (active) setSource(value); });
    return () => { active = false; };
  }, [assetId]);
  return <span className="asset-preview">{source
    ? <img src={source} alt={`${label}预览`} /> : <span>默认</span>}</span>;
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && !saving) setDraft(settings); }, [open, saving, settings]);
  useEffect(() => {
    if (!open) return;
    void applyTheme(draft);
    return () => { void applyTheme(settings); };
  }, [draft, open, settings]);
  if (!open) return null;

  const importImage = async (event: ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'wallpaper') => {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError('仅支持 8MB 内的 PNG、JPEG 或 WebP 图片');
      return;
    }
    setError('');
    try {
      const source = await readUserAsset(file);
      await validateImageDimensions(source);
      const theme = kind === 'avatar' ? await extractTheme(source) : draft.theme;
      const assetId = await saveUserAsset(file, kind, source);
      setDraft((current) => ({
        ...current, theme,
        avatarAssetId: kind === 'avatar' ? assetId : current.avatarAssetId,
        wallpaperAssetId: kind === 'wallpaper' ? assetId : current.wallpaperAssetId,
      }));
    } catch (reason) {
      setError(`图片无法解码，请重新导出为 PNG、JPEG 或 WebP：${String(reason)}`);
    } finally { input.value = ''; }
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await save(draft);
      onClose();
    } catch (reason) {
      setError(`设置保存失败，请重试：${String(reason)}`);
    } finally { setSaving(false); }
  };

  return <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="研究所设置">
    <section className="settings-panel">
      <header><div><span>LAB SETTINGS</span><h2>研究所设置</h2></div>
        <button onClick={onClose} aria-label="关闭设置">×</button></header>
      <div className="asset-settings">
        <label><AssetPreview assetId={draft.avatarAssetId} label="助手头像" />助手头像<input type="file" accept="image/png,image/jpeg,image/webp"
          onChange={(event) => void importImage(event, 'avatar')} /></label>
        <label><AssetPreview assetId={draft.wallpaperAssetId} label="面板壁纸" />面板壁纸<input type="file" accept="image/png,image/jpeg,image/webp"
          onChange={(event) => void importImage(event, 'wallpaper')} /></label>
      </div>
      <label className="opacity-setting">主题遮罩强度
        <input type="range" min="0.4" max="1" step="0.02" value={draft.panelOpacity}
          onChange={(event) => setDraft({ ...draft, panelOpacity: Number(event.target.value) })} />
        <output>{Math.round(draft.panelOpacity * 100)}%</output>
      </label>
      <div className="theme-grid">{Object.entries(labels).map(([key, label]) =>
        <label key={key}>{label}<input type="color" value={draft.theme[key as keyof ThemeSettings]}
          onChange={(event) => setDraft({ ...draft, theme: {
            ...draft.theme, [key]: event.target.value,
          } })} /></label>)}</div>
      <label className="sound-setting"><input type="checkbox" checked={draft.soundEnabled}
        onChange={(event) => setDraft({ ...draft, soundEnabled: event.target.checked })} />完成任务时播放提示音</label>
      {error && <p role="alert">{error}</p>}
      <footer><button disabled={saving} onClick={() => setDraft(createDefaultData().settings)}>恢复默认</button>
        <button disabled={saving} onClick={() => { setDraft(settings); onClose(); }}>取消</button>
        <button disabled={saving} className="settings-save" onClick={() => void submit()}>{saving ? '保存中…' : '应用设置'}</button></footer>
    </section>
  </div>;
}
