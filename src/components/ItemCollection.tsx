import { useEffect, useState } from 'react';
import type { InventionCard } from '../types/card';
import type { PixelItem } from '../types/item';
import { useItems, type ForgeSource } from '../hooks/useItems';
import { loadAsset } from '../utils/appRepository';
import { ItemForgeModal } from './ItemForgeModal';
import { ItemPixelArt } from './ItemPixelArt';
import './items.css';

/** 当前只有一档稀有度，附魔概率取 constants/pixelItems 的 ENCHANT_RATES.gold。 */
const FORGE_RARITY = 'gold';

/** 选择器里的卡牌缩略图；没有插画资源时退回卡牌首字。 */
function CardThumb({ card }: { card: InventionCard }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    if (!card.imageAssetId) { setSource(''); return; }
    void loadAsset(card.imageAssetId).then((value) => {
      if (active) setSource(value);
    }).catch(() => {
      if (active) setSource('');
    });
    return () => { active = false; };
  }, [card.imageAssetId]);
  if (!source) return <span className="forge-card-fallback">{card.name.slice(0, 1)}</span>;
  return <img src={source} alt="" />;
}

function ItemCard({ item }: { item: PixelItem }) {
  return (
    <article className={`pixel-item-card ${item.enchantment ? 'is-enchanted' : ''}`}>
      <div className="pixel-item-art-wrap">
        <ItemPixelArt item={item} className="pixel-item-art" />
        {item.enchantment && <b className="pixel-item-spark">⚡</b>}
      </div>
      <div className="pixel-item-info">
        <div className="pixel-item-title-row">
          <h4>{item.name}</h4>
          {item.enchantment && <span className="enchant-tag">附魔</span>}
          {item.degraded && <span className="item-degraded-tag">公版</span>}
        </div>
        <p>{item.description}</p>
        <small>{item.sourceCardName ? `来源卡牌：${item.sourceCardName}` : `来源：${item.sourceTask}`}</small>
        <time>{new Date(item.earnedAt).toLocaleDateString()}</time>
      </div>
    </article>
  );
}

export function ItemCollection() {
  const { items, cards, canGenerate, forging, stage, forge, revealedItem, setRevealedItem } = useItems();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [source, setSource] = useState<InventionCard | null>(null);

  const launch = () => {
    if (!canGenerate || forging) return;
    setPickerOpen(true);
  };

  /** 选定投入的卡牌（null = 不投卡）后进入锻造炉。 */
  const startForge = async (card: InventionCard | null) => {
    setPickerOpen(false);
    setSource(card);
    setForgeOpen(true);
    const forgeSource: ForgeSource | null = card
      ? { id: card.id, name: card.name, description: card.description }
      : null;
    await forge(forgeSource, FORGE_RARITY);
  };

  const closeForge = () => {
    if (forging) return;
    setForgeOpen(false);
    setRevealedItem(null);
    setSource(null);
  };

  const sortedCards = cards.slice().sort((a, b) => String(b.earnedAt).localeCompare(String(a.earnedAt)));

  return (
    <section className="item-collection-panel" aria-label="离谱道具收藏册">
      <div className="item-collection-header">
        <div>
          <span className="eyebrow">PIXEL ITEMS / 001</span>
          <h3>离谱道具</h3>
          <p>把完成过的事锻成一件小纪念品：选一张卡牌喂给锻造炉，AI 会照它打造道具像素图。</p>
        </div>
        <strong>{items.length}<small> 件</small></strong>
      </div>

      <button className={`item-forge-launch ${!canGenerate ? 'is-done' : ''}`} onClick={launch} disabled={!canGenerate || forging}>
        <span className="forge-launch-icon">✦</span>
        <span>
          <b>{canGenerate ? '锻造今日道具' : '今日道具已锻造'}</b>
          <small>{canGenerate ? '每日一次 · 选一张卡牌作为素材' : '明天再来发现新的像素纪念品'}</small>
        </span>
        <span>→</span>
      </button>

      <div className="pixel-item-grid">
        {items.length === 0
          ? <p className="empty-hint">完成任务后，来这里锻造第一件道具吧。</p>
          : items.slice().sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)).map((item) => <ItemCard item={item} key={item.id} />)}
      </div>

      {pickerOpen && (
        <div className="item-forge-overlay" role="dialog" aria-modal="true" aria-label="选择投入的卡牌" onClick={() => setPickerOpen(false)}>
          <section className="item-forge-panel forge-picker-panel" onClick={(event) => event.stopPropagation()}>
            <div className="forge-kicker">PIXEL ITEM FORGE / 选材</div>
            <h2>挑一张卡牌投进炉子</h2>
            <p className="forge-copy">
              {sortedCards.length === 0
                ? '还没有发明卡牌，研究所会用今天的日常记录凑合一件。'
                : '道具的名字、故事和像素图都会从这张卡牌取材。'}
            </p>
            <div className="forge-card-grid">
              {sortedCards.map((card) => (
                <button className="forge-card-tile" key={card.id} onClick={() => void startForge(card)}>
                  <span className="forge-card-art"><CardThumb card={card} /></span>
                  <b>{card.name}</b>
                  <small>{card.description}</small>
                </button>
              ))}
            </div>
            <button className="forge-skip-button" onClick={() => void startForge(null)}>不投卡，直接锻造</button>
          </section>
        </div>
      )}

      <ItemForgeModal
        open={forgeOpen}
        forging={forging || !revealedItem}
        stage={stage}
        item={revealedItem}
        source={source}
        onClose={closeForge}
      />
    </section>
  );
}
