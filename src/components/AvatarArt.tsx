import { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { loadAsset } from '../utils/appRepository';
import './avatar.css';

/** 使用本地几何头像，确保首版不依赖外部图片服务。 */
export function AvatarArt() {
  const { settings } = useSettings();
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!settings.avatarAssetId) { setSource(''); return; }
    void loadAsset(settings.avatarAssetId).then((value) => { if (active) setSource(value); });
    return () => { active = false; };
  }, [settings.avatarAssetId]);
  if (source) return <span className="avatar-art"><img src={source} alt="" /></span>;
  return <span className="avatar-art" aria-hidden="true">
    <span className="avatar-orbit" /><span className="avatar-head" />
    <span className="avatar-body" /><span className="avatar-spark" />
  </span>;
}
