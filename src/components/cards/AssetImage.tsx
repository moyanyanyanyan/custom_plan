import { useEffect, useState } from 'react';
import type { InventionCard } from '../../types/card';
import { loadAsset } from '../../utils/appRepository';

export function AssetImage({ card, onError }: { card: InventionCard; onError?: () => void }) {
  const [source, setSource] = useState(card.imagePath ?? '');
  useEffect(() => {
    let active = true;
    if (!card.imageAssetId) { setSource(card.imagePath ?? ''); return; }
    void loadAsset(card.imageAssetId).then((value) => {
      if (active) setSource(value);
    }).catch(() => {
      if (active) { setSource(''); onError?.(); }
    });
    return () => { active = false; };
  }, [card.imageAssetId, card.imagePath, onError]);
  if (!source) return null;
  return <img src={source} alt={card.name || '发明卡牌'} loading="lazy" onError={() => {
    setSource('');
    onError?.();
  }} />;
}
