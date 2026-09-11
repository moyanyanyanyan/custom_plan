import { useEffect, useRef, useState } from 'react';
import { createDefaultData } from '../../constants/defaults';
import { useImageCrop } from '../../hooks/useImageCrop';
import { useSettings } from '../../hooks/useSettings';
import type { AppSettings, CropResult, ThemeSettings } from '../../types/settings';
import { loadAsset, saveUserAsset } from '../../utils/appRepository';
import { extractTheme } from '../../utils/colorExtraction';
import { applyTheme } from '../../utils/theme';
import { ImageCropper } from './ImageCropper';
import './settings.css';

const labels: Record<keyof ThemeSettings, string> = {
  primary: '主背景', secondary: '副背景', accent: '强调色', completed: '完成色',
  pending: '待办色', text: '文字色', cardHighlight: '卡牌高光', slimeTint: '史莱姆',
};

function AssetPreview({ assetId, label, previewSource }: {
  assetId: string | null; label: string; previewSource?: string;
}) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    if (previewSource) { setSource(previewSource); return; }
    if (!assetId) { setSource(''); return; }
    void loadAsset(assetId).then((value) => { if (active) setSource(value); });
    return () => { active = false; };
  }, [assetId, previewSource]);
  return <span className="asset-preview">{source
    ? <img src={source} alt={`${label}预览`} /> : <span>默认</span>}</span>;
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const crop = useImageCrop();
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) { setDraft(settings); crop.reset(); setSaveError(''); }
    wasOpen.current = open;
  }, [open, settings]);
  useEffect(() => { if (open) void applyTheme(draft); }, [draft, open]);
  if (!open) return null;
  const closeWithoutSaving = () => {
    void applyTheme(settings); setDraft(settings); crop.reset(); setSaveError(''); onClose();
  };
  const acceptCrop = async (result: CropResult) => {
    const kind = crop.cropTarget?.kind; crop.acceptCrop(result);
    if (kind !== 'avatar') return;
    try { const theme = await extractTheme(result.previewSource); setDraft((current) => ({ ...current, theme })); }
    catch (reason) { crop.setErrors((current) => ({ ...current, avatar: `头像取色失败：${String(reason)}` })); }
  };
  const submit = async () => {
    setSaving(true); setSaveError('');
    const username = draft.username.trim();
    if (!username || username.length > 20) { setUsernameError('用户名需为 1–20 个字符'); setSaving(false); return; }
    setUsernameError('');
    try {
      let next = draft;
      next = { ...next, username };
      for (const kind of ['avatar', 'wallpaper'] as const) {
        const asset = crop.pending[kind]; if (!asset) continue;
        try {
          const assetId = await saveUserAsset(asset.file, kind, asset.previewSource);
          next = { ...next, [kind === 'avatar' ? 'avatarAssetId' : 'wallpaperAssetId']: assetId };
        } catch (reason) {
          crop.setErrors((current) => ({ ...current, [kind]: `资产保存失败：${String(reason)}` })); return;
        }
      }
      await save(next); setDraft(next); crop.setPending({}); onClose();
    } catch (reason) { setSaveError(`设置保存失败，请重试：${String(reason)}`); }
    finally { setSaving(false); }
  };
  return <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="研究所设置">
    <section className="settings-panel"><header><div><span>LAB SETTINGS</span><h2>研究所设置</h2></div>
      <button onClick={closeWithoutSaving} aria-label="关闭设置">×</button></header>
      <div className="asset-settings">
        <label><AssetPreview assetId={draft.avatarAssetId} label="助手头像" previewSource={crop.pending.avatar?.previewSource} />助手头像
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void crop.importImage(event, 'avatar')} />
          {crop.errors.avatar && <small role="alert">{crop.errors.avatar}</small>}</label>
        <label><AssetPreview assetId={draft.wallpaperAssetId} label="面板壁纸" previewSource={crop.pending.wallpaper?.previewSource} />面板壁纸
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void crop.importImage(event, 'wallpaper')} />
          {crop.errors.wallpaper && <small role="alert">{crop.errors.wallpaper}</small>}</label>
      </div>
      <label className="username-setting"><span>用户名</span><input value={draft.username} maxLength={20}
        onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="请输入用户名" />
        {usernameError && <small role="alert">{usernameError}</small>}</label>
      {(draft.wallpaperAssetId || crop.pending.wallpaper) && <label className="opacity-setting"><span>壁纸遮罩强度</span>
        <input type="range" aria-label="壁纸遮罩强度" min="0.4" max="1" step="0.02" value={draft.panelOpacity}
          onChange={(event) => setDraft({ ...draft, panelOpacity: Number(event.target.value) })} />
        <output>{Math.round(draft.panelOpacity * 100)}%</output></label>}
      <div className="theme-grid">{Object.entries(labels).map(([key, label]) => <label key={key}>{label}
        <input aria-label={label} type="color" value={draft.theme[key as keyof ThemeSettings]}
          onChange={(event) => setDraft({ ...draft, theme: { ...draft.theme, [key]: event.target.value } })} /></label>)}</div>
      <label className="sound-setting"><input type="checkbox" checked={draft.soundEnabled}
        onChange={(event) => setDraft({ ...draft, soundEnabled: event.target.checked })} />完成任务时播放提示音</label>
      <label className="stepfun-key-setting"><span>StepFun API Key</span><input type="password" value={draft.stepfunApiKey}
        onChange={(event) => setDraft({ ...draft, stepfunApiKey: event.target.value })} placeholder="由开发者提供，可在此覆盖" />
        <span className="setting-hint">仅保存在本机应用数据中</span></label>
      {saveError && <p role="alert">{saveError}</p>}
      <footer><button disabled={saving} onClick={() => setDraft(createDefaultData().settings)}>恢复默认</button>
        <button disabled={saving} onClick={closeWithoutSaving}>取消</button>
        <button disabled={saving} className="settings-save" onClick={() => void submit()}>{saving ? '保存中…' : '应用设置'}</button></footer>
    </section>
    {crop.cropTarget && <ImageCropper target={crop.cropTarget} onCancel={() => crop.setCropTarget(null)}
      onReselect={crop.reselect} onConfirm={(result) => void acceptCrop(result)} />}
  </div>;
}
