import { useEffect, useRef, useState } from 'react';
import type { InventionCard } from '../types/card';
import { AssetImage } from './cards/AssetImage';
import './reveal.css';

interface CardRevealModalProps {
  card: InventionCard | null;
  open: boolean;
  onClose: () => void;
}

/** 居中揭示弹窗：点遮罩/ESC/右上角 × 关闭，支持点击翻转查看背面任务 */
export function CardRevealModal({ card, open, onClose }: CardRevealModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFlipped(false);
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
        <div className="card-viewport" onClick={() => setFlipped((v) => !v)}>
          <div className={`card-face${flipped ? ' back' : ' front'}`}>
            {!flipped && (
              <>
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
                  <time>{card.date}</time>
                </div>
              </>
            )}
            {flipped && (
              <div className="reveal-back">
                <h3>任务来源</h3>
                <ul>
                  {card.backTasks.map((task, idx) => (
                    <li key={idx}>{idx + 1}. {task}</li>
                  ))}
                </ul>
                <time>{card.date}</time>
              </div>
            )}
          </div>
        </div>
        <div className="reveal-hint">点击卡牌翻面</div>
      </div>
    </div>
  );
}
