import { useMemo, useState } from 'react';
import type { InventionCard } from '../types/card';
import type { Task } from '../types/task';
import { cardStackKey } from '../utils/fantasyCards';
import { CardFace } from './cards/CardFace';
import { CardDialog } from './cards/CardDialog';
import './collection.css';

export function CardCollection({ cards }: { cards: InventionCard[]; tasksByDate?: Record<string, Task[]> }) {
  const [selected, setSelected] = useState<InventionCard[] | null>(null);
  const stacks = useMemo(() => {
    const groups = new Map<string, InventionCard[]>();
    for (const card of cards) {
      if (!card || typeof card.name !== 'string' || typeof card.description !== 'string') continue;
      const key = cardStackKey(card);
      groups.set(key, [...(groups.get(key) ?? []), card]);
    }
    return [...groups.values()];
  }, [cards]);
  return <section className="collection-panel" aria-label="卡牌收藏册">
    <div className="collection-header"><h3>卡牌收藏</h3><span>{cards.length} 张</span></div>
    <div className="card-grid">
      {stacks.length === 0 && <p className="empty-hint">完成今日至少5项任务后，可以领取一张卡牌。</p>}
      {stacks.map(stack => <article key={cardStackKey(stack[0])} className="card-slot">
        <button className="fantasy-open" aria-label={`查看${stack[0].name}`} onClick={() => setSelected([...stack].sort((a,b) => b.earnedAt.localeCompare(a.earnedAt)))}>
          <CardFace card={stack[0]} compact />
        </button>
        {stack.length > 1 && <span className="fantasy-stack-count">×{stack.length}</span>}
      </article>)}
    </div>
    {selected && <CardDialog cards={selected} onClose={() => setSelected(null)} />}
  </section>;
}
