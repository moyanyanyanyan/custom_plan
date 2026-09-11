import type { CardCollection, InventionCard } from '../types/card';
import { useState, useMemo, useCallback } from 'react';
import { AssetImage } from './cards/AssetImage';
import './collection.css';
import './cards/browser.css';

/** 单张卡面：新卡插画存于资源文件（imageAssetId），旧卡才用内联 imagePath，
 *  两者统一交给 AssetImage 解析，与揭晓弹窗共用同一条渲染链路；
 *  无图或加载失败时回退到名称首字占位。 */
function CardArt({ card, count }: { card: InventionCard; count: number }) {
  const [broken, setBroken] = useState(false);
  // 必须稳定引用：AssetImage 的 effect 依赖 onError，内联箭头会导致每帧重新读取资源。
  const failImage = useCallback(() => setBroken(true), []);
  const showImage = !broken && (!!card.imageAssetId || !!card.imagePath);
  return (
    <div className="card-art" role="img" aria-label={card.name}>
      {showImage ? (
        <AssetImage card={card} onError={failImage} />
      ) : (
        <span className="card-placeholder">{card.name.slice(0, 2)}</span>
      )}
      {count > 1 && <span className="stack-badge">×{count}</span>}
    </div>
  );
}

export function CardCollection({ cards }: { cards: InventionCard[] }) {
  const collection = useMemo(() => ({ cards, updatedAt: new Date().toISOString() }), [cards]);
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const [expanding, setExpanding] = useState<{ stackKey: string; cards: InventionCard[]; index: number } | null>(null);

  const closeExpand = () => setExpanding(null);

  const handleBrowseClick = (stack: InventionCard[]) => {
    const sorted = [...stack].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
    setExpanding({ stackKey: sorted[0].stackKey, cards: sorted, index: 0 });
  };

  const prevCard = () => {
    setExpanding((prev) => {
      if (!prev) return prev;
      return { ...prev, index: (prev.index - 1 + prev.cards.length) % prev.cards.length };
    });
  };

  const nextCard = () => {
    setExpanding((prev) => {
      if (!prev) return prev;
      return { ...prev, index: (prev.index + 1) % prev.cards.length };
    });
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
          const flipped = flippedId === representative.id;
          return (
            <article key={representative.stackKey} className="card-slot">
              <div className="card-art-wrapper" onClick={() => setFlippedId(flipped ? null : representative.id)}>
                <div className={`card-flipper${flipped ? ' flipped' : ''}`}>
                  <div className="card-face card-front">
                    <div className="card-front-inner">
                      <div className="card-name">{representative.name}</div>
                      <CardArt card={representative} count={count} />
                      <div className="card-desc">{representative.description}</div>
                      <div className="card-footer">
                        <span>离谱发明所</span>
                        <time>{representative.date}</time>
                      </div>
                    </div>
                  </div>
                  <div className="card-face card-back">
                    <div className="card-back-content">
                      <h4>任务来源</h4>
                      <ul>
                        {representative.backTasks.map((task, idx) => (
                          <li key={idx}>{idx + 1}. {task}</li>
                        ))}
                      </ul>
                      <time>{representative.date}</time>
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="static-button split-button"
                onClick={() => handleBrowseClick(stack)}
                title="浏览堆叠卡牌"
              >
                浏览
              </button>
            </article>
          );
        })}
      </div>

      {expanding && (
        <div className="expand-overlay" onClick={closeExpand}>
          <div className="expand-carousel" onClick={(e) => e.stopPropagation()}>
            <button className="expand-nav" onClick={prevCard} aria-label="上一张">‹</button>
            <div className="expand-card">
              <CardArt card={expanding.cards[expanding.index]} count={1} />
              <div className="expand-meta">
                <span className="expand-count">拥有 {expanding.cards.length} 张</span>
                <span className="expand-index">{expanding.index + 1}/{expanding.cards.length}</span>
              </div>
            </div>
            <button className="expand-nav" onClick={nextCard} aria-label="下一张">›</button>
          </div>
          <p className="expand-hint">点击任意位置关闭浏览</p>
        </div>
      )}
    </section>
  );
}
