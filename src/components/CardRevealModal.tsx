import { useEffect, useRef } from 'react';
import type { InventionCard } from '../types/card';
import { AssetImage } from './cards/AssetImage';
import './reveal.css';

interface CardRevealModalProps {
  card: InventionCard | null;
  open: boolean;
  onClose: () => void;
}

/** 居中揭示弹窗：点遮罩/ESC/右上角 × 关闭 */
export function CardRevealModal({ card, open, onClose }: CardRevealModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !card) return null;

  return (
    <div className="reveal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="新卡揭示">
      <div className="reveal-card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="reveal-close" onClick={onClose} aria-label="关闭">×</button>
        <div className="reveal-art">
          {(card.imageAssetId || card.imagePath) ? (
            <AssetImage card={card} />
          ) : (
            <span className="card-placeholder">{card.name.slice(0, 2)}</span>
          )}
        </div>
        <div className="reveal-info">
          <h3>{card.name}</h3>
          <p>{card.description}</p>
          <p className="reveal-sources">来源任务：{card.sourceTasks.join('、')}</p>
          <time>{new Date(card.earnedAt).toLocaleString()}</time>
        </div>
      </div>
    </div>
  );
}
