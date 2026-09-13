import { useEffect, useState } from 'react';
import type { PixelItem } from '../types/item';
import { loadAsset } from '../utils/appRepository';

/**
 * 道具像素图：有 AI 生成的 imageAssetId 就显示真图，没有则退回首字方块。
 * 与卡牌插画同一条资源链路（save_user_asset / load_asset_data_url）。
 */
export function ItemPixelArt({ item, className = 'item-pixel-icon' }: { item: PixelItem; className?: string }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!item.imageAssetId) { setSource(''); return; }
    void loadAsset(item.imageAssetId).then((value) => {
      if (active) setSource(value);
    }).catch(() => {
      if (active) setSource('');
    });
    return () => { active = false; };
  }, [item.imageAssetId]);
  if (!source) return <div className={className}>{item.name.slice(0, 1)}</div>;
  return <img className={`${className} is-art`} src={source} alt={item.name} />;
}
