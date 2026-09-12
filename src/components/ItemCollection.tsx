import { useState } from 'react';
import type { Experiment } from '../types/experiment';
import type { PixelItem } from '../types/item';
import { useItems } from '../hooks/useItems';
import { ItemForgeModal } from './ItemForgeModal';
import './items.css';

type Props = { tasks: Experiment[] };

function ItemCard({ item }: { item: PixelItem }) {
  return (
    <article className={`pixel-item-card ${item.enchantment ? 'is-enchanted' : ''}`}>
      <div className="pixel-item-art" aria-hidden="true">
        <span>{item.name.slice(0, 1)}</span>
        {item.enchantment && <b>⚡</b>}
      </div>
      <div className="pixel-item-info">
        <div className="pixel-item-title-row"><h4>{item.name}</h4>{item.enchantment && <span className="enchant-tag">附魔</span>}</div>
        <p>{item.description}</p>
        <small>来源：{item.sourceTask}</small>
        <time>{new Date(item.earnedAt).toLocaleDateString()}</time>
      </div>
    </article>
  );
}

export function ItemCollection({ tasks }: Props) {
  const { items, canGenerate, forging, forge, revealedItem, setRevealedItem } = useItems(tasks);
  const [forgeOpen, setForgeOpen] = useState(false);
  const startForge = async () => {
    if (!canGenerate || forging) return;
    setForgeOpen(true);
    await new Promise((resolve) => window.setTimeout(resolve, 2700));
    await forge();
  };
  const closeForge = () => { if (!forging) { setForgeOpen(false); setRevealedItem(null); } };
  return (
    <section className="item-collection-panel" aria-label="离谱道具收藏册">
      <div className="item-collection-header">
        <div><span className="eyebrow">PIXEL ITEMS / 001</span><h3>离谱道具</h3><p>把完成过的事，锻造成一件小小的纪念品。</p></div>
        <strong>{items.length}<small> 件</small></strong>
      </div>
      <button className={`item-forge-launch ${!canGenerate ? 'is-done' : ''}`} onClick={() => void startForge()} disabled={!canGenerate || forging}>
        <span className="forge-launch-icon">✦</span><span><b>{canGenerate ? '锻造今日道具' : '今日道具已锻造'}</b><small>{canGenerate ? '每日一次 · 独立于卡牌次数' : '明天再来发现新的像素纪念品'}</small></span><span>→</span>
      </button>
      <div className="pixel-item-grid">
        {items.length === 0 ? <p className="empty-hint">完成任务后，来这里锻造第一件道具吧。</p> : items.slice().sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)).map((item) => <ItemCard item={item} key={item.id} />)}
      </div>
      <ItemForgeModal open={forgeOpen} forging={forging || !revealedItem} item={revealedItem} onClose={closeForge} />
    </section>
  );
}
