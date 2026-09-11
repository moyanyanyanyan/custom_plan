import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../constants/generation';
import { createDefaultData } from '../../constants/defaults';
import { useSettings } from '../../hooks/useSettings';
import type { AppSettings, PendingUserAsset, ThemeSettings, UserAssetKind } from '../../types/settings';
import { extractTheme, validateImageDimensions } from '../../utils/colorExtraction';
import { loadAsset, readUserAsset, saveUserAsset } from '../../utils/appRepository';
import { applyTheme } from '../../utils/theme';
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

export function SettingsPanel({ open, onClose, onReplayGuide }: {
  open: boolean; onClose: () => void; onReplayGuide?: () => void;
}) {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [pending, setPending] = useState<Partial<Record<UserAssetKind, PendingUserAsset>>>({});
  const [assetErrors, setAssetErrors] = useState<Partial<Record<UserAssetKind, string>>>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(settings); setPending({}); setAssetErrors({}); setSaveError('');
    }
    wasOpen.current = open;
  }, [open, settings]);
  useEffect(() => { if (open) void applyTheme(draft); }, [draft, open]);
  if (!open) return null;

  const closeWithoutSaving = () => {
    void applyTheme(settings);
    setDraft(settings); setPending({}); setAssetErrors({}); setSaveError('');
    onClose();
  };

  const importImage = async (event: ChangeEvent<HTMLInputElement>, kind: UserAssetKind) => {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setAssetErrors((current) => ({ ...current, [kind]: '文件格式或大小不合规：仅支持 8MB 内的 PNG、JPEG 或 WebP' }));
      input.value = '';
      return;
    }
    setAssetErrors((current) => ({ ...current, [kind]: '' }));
    try {
      let source: string;
      try { source = await readUserAsset(file); }
      catch (reason) { throw new Error(`图片读取失败：${String(reason)}`); }
      try { await validateImageDimensions(source); }
      catch (reason) { throw new Error(`图片解码或尺寸校验失败：${String(reason)}`); }
      let theme = draft.theme;
      if (kind === 'avatar') {
        try { theme = await extractTheme(source); }
        catch (reason) { throw new Error(`头像取色失败：${String(reason)}`); }
      }
      setPending((current) => ({ ...current, [kind]: { file, previewSource: source } }));
      setDraft((current) => ({ ...current, theme }));
    } catch (reason) {
      setAssetErrors((current) => ({ ...current, [kind]: String(reason) }));
    } finally { input.value = ''; }
  };

  const submit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      let next = draft;
      for (const kind of ['avatar', 'wallpaper'] as const) {
        const asset = pending[kind];
        if (!asset) continue;
        try {
          const assetId = await saveUserAsset(asset.file, kind, asset.previewSource);
          next = { ...next, [kind === 'avatar' ? 'avatarAssetId' : 'wallpaperAssetId']: assetId };
        } catch (reason) {
          setAssetErrors((current) => ({ ...current, [kind]: `资产保存失败：${String(reason)}` }));
          return;
        }
      }
      await save(next);
      setDraft(next); setPending({});
      onClose();
    } catch (reason) {
      setSaveError(`设置保存失败，请重试：${String(reason)}`);
    } finally { setSaving(false); }
  };

  return <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="研究所设置">
    <section className="settings-panel">
      <header><div><span>LAB SETTINGS</span><h2>研究所设置</h2></div>
        <button onClick={closeWithoutSaving} aria-label="关闭设置">×</button></header>
      <div className="asset-settings">
        <label><AssetPreview assetId={draft.avatarAssetId} label="助手头像" previewSource={pending.avatar?.previewSource} />助手头像
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void importImage(event, 'avatar')} />
          {assetErrors.avatar && <small role="alert">{assetErrors.avatar}</small>}</label>
        <label><AssetPreview assetId={draft.wallpaperAssetId} label="面板壁纸" previewSource={pending.wallpaper?.previewSource} />面板壁纸
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void importImage(event, 'wallpaper')} />
          {assetErrors.wallpaper && <small role="alert">{assetErrors.wallpaper}</small>}</label>
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
      <label className="stepfun-key-setting">StepFun API Key
        <input type="password" value={draft.stepfunApiKey}
          onChange={(event) => setDraft({ ...draft, stepfunApiKey: event.target.value })}
          placeholder="由开发者提供，可在此覆盖" />
        <span className="setting-hint">仅保存在本机应用数据中</span></label>
      {saveError && <p role="alert">{saveError}</p>}
      {onReplayGuide && <button type="button" className="replay-guide"
        onClick={() => { onReplayGuide(); }}>↻ 重新查看新手指引</button>}
      <footer><button disabled={saving} onClick={() => setDraft(createDefaultData().settings)}>恢复默认</button>
        <button disabled={saving} onClick={closeWithoutSaving}>取消</button>
        <button disabled={saving} className="settings-save" onClick={() => void submit()}>{saving ? '保存中…' : '应用设置'}</button></footer>
    </section>
  </div>;
}
