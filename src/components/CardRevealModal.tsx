import { useCallback, useEffect, useRef, useState } from 'react';
import type { InventionCard } from '../types/card';
import { TIER_LABELS } from '../types/card';
import type { Task } from '../types/task';
import { mergeBackTasks } from '../utils/cardBackTasks';
import './reveal.css';
import { AssetImage } from './cards/AssetImage';

interface CardRevealModalProps {
  card: InventionCard | null;
  open: boolean;
  onClose: () => void;
  /** 该卡所属日期的任务：用于把生成之后新完成的任务补进卡背（见 cardBackTasks）。 */
  tasks?: Task[];
}

function CardFace({ card, flipped, backTasks }: {
  card: InventionCard; flipped: boolean; backTasks: string[];
}) {
  return (
    <div className={`card-flipper${flipped ? ' flipped' : ''}`}>
      <div className="card-face card-front">
        <div className={`card-front-inner tier-${card.tier}`}>
          <span className="card-tier-badge" title="材质等级">{TIER_LABELS[card.tier] ?? '铜'}</span>
          <div className="card-name">{card.name}</div>
          <div className="card-art reveal-card-art">
            {(card.imageAssetId || card.imagePath) ? (
              <AssetImage card={card} />
            ) : (
              <span className="card-placeholder">{card.name.slice(0, 2)}</span>
            )}
          </div>
          <div className="card-desc">{card.description}</div>
          <div className="card-footer">
            <span>离谱发明所</span>
            <time>{card.date}</time>
          </div>
        </div>
      </div>
      <div className="card-face card-back">
        <div className="card-back-content">
          <h4>任务来源</h4>
          <ul>
            {backTasks.map((task, idx) => (
              <li key={idx}>{idx + 1}. {task}</li>
            ))}
          </ul>
          <time>{card.date}</time>
        </div>
      </div>
    </div>
  );
}

/** 居中揭示弹窗：点遮罩/ESC/右上角 × 关闭，支持点击翻转查看背面任务 */
export function CardRevealModal({ card, open, onClose, tasks }: CardRevealModalProps) {
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

  const toggleFlip = useCallback(() => setFlipped((v) => !v), []);

  if (!open || !card) return null;

  return (
    <div className="reveal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="新卡揭示">
      <div className="reveal-card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="reveal-close" onClick={onClose} aria-label="关闭">×</button>
        <div onClick={toggleFlip}>
          <CardFace card={card} flipped={flipped} backTasks={mergeBackTasks(card, tasks)} />
        </div>
        <div className="reveal-hint">点击卡牌翻面</div>
      </div>
    </div>
  );
}
