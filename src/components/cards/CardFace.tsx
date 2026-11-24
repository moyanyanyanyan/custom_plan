import { useCallback, useState } from 'react';
import type { InventionCard } from '../../types/card';
import { CATEGORIES, isFantasyCard, RELATIONS, SUITS } from '../../utils/fantasyCards';
import { AssetImage } from './AssetImage';
import './card-face.css';

function Art({ card }: { card: InventionCard }) {
  const [broken, setBroken] = useState(false);
  const fail = useCallback(() => setBroken(true), []);
  return <div className="fantasy-art">
    {!broken && (card.imageAssetId || card.imagePath) ? <AssetImage card={card} onError={fail} />
      : <svg viewBox="0 0 32 32" role="img" aria-label="像素印章占位图" shapeRendering="crispEdges">
        <path fill="#222633" d="M12 4h8v4h4v12h-4v4h-8v-4H8V8h4zM5 24h22v5H5z" />
        <path fill="#b79550" d="M12 8h8v12h-8zM8 25h16v2H8z" />
        <path fill="#e2cb8c" d="M13 9h3v8h-3z" />
      </svg>}
  </div>;
}

export function CardFace({ card, back = false, compact = false }: { card: InventionCard; back?: boolean; compact?: boolean }) {

  const fantasy = isFantasyCard(card);
  if (back) return <div className="fantasy-card fantasy-back" aria-label="角色扮演牌背">
    <img src="/card-back.jpg" alt="" draggable={false} />
  </div>;
  const suit = fantasy ? SUITS[card.suit] : null;
  const corner = suit && <><span>{card.rank}</span><span>{suit.symbol}</span></>;
  return <div className={`fantasy-card${compact ? ' fantasy-compact' : ''}${fantasy ? '' : ' fantasy-legacy'}`}>
    {suit && <><div className={`fantasy-corner${suit.red ? ' red' : ''}`}>{corner}</div>
      <div className={`fantasy-corner bottom${suit.red ? ' red' : ''}`}>{corner}</div></>}
    <div className="fantasy-content">
      <div className="fantasy-heading"><span className="fantasy-category">{fantasy ? CATEGORIES[card.category] : '旧藏'}</span>
        <h3>{card.name}</h3>{fantasy && card.relation && <small>{RELATIONS[card.relation.kind].direction}</small>}</div>
      <Art key={card.id} card={card} />
      {!compact && <>{fantasy && <div className="fantasy-effect"><h4>效果</h4>
        <p>{card.effect.split(/(\d+(?:\.\d+)?%?)/g).map((part, i) => /^\d/.test(part) ? <strong key={i}>{part}</strong> : part)}</p>
      </div>}
        <blockquote className="fantasy-flavor"><span>说明</span><p>“{card.description}”</p></blockquote></>}
      {compact && <span className="fantasy-read">展开阅读</span>}
    </div>
  </div>;
}

export function CardDetails({ card }: { card: InventionCard }) {
  return <section className="fantasy-details" aria-label="卡牌详情">
    {card.setting && <p><b>设定说明</b> {card.setting}</p>}
    <p><b>获得日期</b> <time>{card.date}</time></p>
    <h4>任务来源</h4><ul>{card.sourceTasks.map((task, index) => <li key={index}>{task}</li>)}</ul>
  </section>;
}
