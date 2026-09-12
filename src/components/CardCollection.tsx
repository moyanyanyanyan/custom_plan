import type { CardCollection, InventionCard } from '../types/card';
import { useState, useMemo, useCallback } from 'react';
import { AssetImage } from './cards/AssetImage';
import './collection.css';
import './cards/browser.css';

/** 卡面插画：新卡插画存于资源文件（imageAssetId），旧卡才用内联 imagePath，
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

/** 游戏王比例（59:86）卡面：标题在顶部独立一条、插画居中、文案与落款在下，四段互不重叠。 */
function CardFace({ card, count, flipped }: { card: InventionCard; count: number; flipped: boolean }) {
  return (
    <div className={`card-flipper${flipped ? ' flipped' : ''}`}>
      <div className="card-face card-front">
        <div className="card-front-inner">
          <div className="card-name">{card.name}</div>
          <CardArt card={card} count={count} />
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
            {card.backTasks.map((task, idx) => (
              <li key={idx}>{idx + 1}. {task}</li>
            ))}
          </ul>
          <time>{card.date}</time>
        </div>
      </div>
    </div>
  );
}

export function CardCollection({ cards }: { cards: InventionCard[] }) {
  const collection = useMemo(() => ({ cards, updatedAt: new Date().toISOString() }), [cards]);

  const [expanding, setExpanding] = useState<{ stackKey: string; cards: InventionCard[]; index: number } | null>(null);
  // 翻牌只在「浏览」里发生：网格上的卡面保持正面，点浏览进来后才可翻面看任务来源。
  const [browsingFlipped, setBrowsingFlipped] = useState(false);

  const closeExpand = () => {
    setExpanding(null);
    setBrowsingFlipped(false);
  };

  const handleBrowseClick = (stack: InventionCard[]) => {
    const sorted = [...stack].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
    setExpanding({ stackKey: sorted[0].stackKey, cards: sorted, index: 0 });
    setBrowsingFlipped(false);
  };

  const step = (delta: number) => {
    setExpanding((prev) => {
      if (!prev) return prev;
      return { ...prev, index: (prev.index + delta + prev.cards.length) % prev.cards.length };
    });
    setBrowsingFlipped(false);
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
            <article key={representative.stackKey} className="card-slot" onClick={() => handleBrowseClick(stack)}>
              <CardFace card={representative} count={count} flipped={false} />
            </article>
          );
        })}
      </div>

      {expanding && (
        <div className="expand-overlay" onClick={closeExpand}>
          <div className="expand-carousel" onClick={(e) => e.stopPropagation()}>
            <button className="expand-nav" onClick={() => step(-1)} aria-label="上一张">‹</button>
            <div className="expand-card" onClick={() => setBrowsingFlipped((v) => !v)}>
              <CardFace card={expanding.cards[expanding.index]} count={1} flipped={browsingFlipped} />
              <div className="expand-meta">
                <span className="expand-count">拥有 {expanding.cards.length} 张</span>
                <span className="expand-index">{expanding.index + 1}/{expanding.cards.length}</span>
              </div>
              <p className="expand-tip">{browsingFlipped ? '点击卡牌翻回正面' : '点击卡牌翻面 · 查看任务来源'}</p>
            </div>
            <button className="expand-nav" onClick={() => step(1)} aria-label="下一张">›</button>
          </div>
          <p className="expand-hint">点击空白处关闭浏览</p>
        </div>
      )}
    </section>
  );
}
