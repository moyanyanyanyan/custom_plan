import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InventionCard } from '../../types/card';
import { CardDetails, CardFace } from './CardFace';

export function CardDialog({ cards, onClose, label = '卡牌浏览' }: { cards: InventionCard[]; onClose: () => void; label?: string }) {
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close.current(); }
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); previous?.focus(); };
  }, []);
  const card = cards[index];
  const step = (delta: number) => { setIndex((index + delta + cards.length) % cards.length); setBack(false); };
  return createPortal(<div className="fantasy-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="fantasy-dialog" role="dialog" aria-modal="true" aria-label={label}>
      <div className="fantasy-stage">
      <div className="fantasy-controls"><span>{index + 1} / {cards.length}</span><button className="fantasy-close" onClick={onClose} aria-label="关闭卡牌">×</button></div>
      <button className="fantasy-flip" aria-label={back ? '翻回正面' : '翻到背面'} onClick={() => setBack(previous => !previous)}>
        <div key={card.id} className={`fantasy-flipper${back ? ' is-back' : ''}`}>
          <div className="fantasy-flip-face" aria-hidden={back}><CardFace card={card} /></div>
          <div className="fantasy-flip-face fantasy-flip-reverse" aria-hidden={!back}><CardFace card={card} back /></div>
        </div>
      </button>
      <div className="fantasy-controls">{cards.length > 1 && <button onClick={() => step(-1)}>上一张</button>}
        <span>点击卡牌或按回车翻面</span>{cards.length > 1 && <button onClick={() => step(1)}>下一张</button>}</div>
      </div>
      <CardDetails card={card} />
    </div>
  </div>, document.body);
}
