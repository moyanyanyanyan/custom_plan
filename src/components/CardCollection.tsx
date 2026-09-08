import type { CardCollection, InventionCard } from '../types/card';
import { loadCollection, saveCollection, splitCard } from '../utils/cardStorage';
import { useState } from 'react';
import './collection.css';

/** 单张卡面：有图（dataURL 或 http URL）则渲染 <img>，加载失败/无图时回退到名称占位。 */
function CardArt({ card, count }: { card: InventionCard; count: number }) {
  const [broken, setBroken] = useState(false);
  const showImage = !!card.imagePath && !broken;
  return (
    <div className="card-art" role="img" aria-label={card.name}>
      {showImage ? (
        <img src={card.imagePath} alt={card.name} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="card-placeholder">{card.name.slice(0, 2)}</span>
      )}
      {count > 1 && <span className="stack-badge">×{count}</span>}
    </div>
  );
}

export function CardCollection() {
  const [collection, setCollection] = useState<CardCollection>(loadCollection);

  const handleSplit = (stackKey: string) => {
    const result = splitCard(collection, stackKey);
    if (!result) {
      alert('该卡牌只有一张，无法分化');
      return;
    }
    setCollection(result);
    saveCollection(result);
  };

  // 按 stackKey 分组统计数量
  const stackMap = new Map<string, InventionCard[]>();
  for (const card of collection.cards) {
    const list = stackMap.get(card.stackKey) || [];
    list.push(card);
    stackMap.set(card.stackKey, list);
  }

  const stacks = Array.from(stackMap.values());

  return (
    <section className="collection-panel" aria-label="卡牌收藏册">
      <div className="collection-header">
        <div>
          <span className="eyebrow">ARCHIVE / 001</span>
          <h3>发明卡牌</h3>
        </div>
        <div className="collection-count">
          <strong>{collection.cards.length}</strong>
          <span>张</span>
        </div>
      </div>
      <div className="card-grid">
        {stacks.length === 0 && (
          <p className="empty-hint">完成今日任务后，启动发明机即可获得卡牌</p>
        )}
        {stacks.map((stack) => {
          const representative = stack[0];
          const count = stack.length;
          return (
            <article key={representative.stackKey} className="card-slot">
              <CardArt card={representative} count={count} />
              <div className="card-info">
                <h4>{representative.name}</h4>
                <p>{representative.description}</p>
                <time>{new Date(representative.earnedAt).toLocaleString()}</time>
              </div>
              <button
                className="static-button split-button"
                onClick={() => handleSplit(representative.stackKey)}
                disabled={count <= 1}
                title={count <= 1 ? '同款卡牌堆叠超过一张后才能分化' : '把堆叠的卡牌分化为独立单张'}
              >
                分化
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
