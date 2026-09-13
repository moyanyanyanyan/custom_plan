import type { InventionCard } from '../types/card';
import type { PixelItem } from '../types/item';
import type { ForgeStage } from '../hooks/useItems';
import { AssetImage } from './cards/AssetImage';
import { ItemPixelArt } from './ItemPixelArt';
import './items.css';

type Props = {
  open: boolean;
  forging: boolean;
  stage: ForgeStage;
  item: PixelItem | null;
  source: InventionCard | null;
  onClose: () => void;
};

const STAGE_COPY: Record<ForgeStage, string> = {
  idle: '研究所正在全力运转…',
  reading: '正在阅读卡牌，起草道具档案…',
  drawing: '正在把道具画成像素图…',
};

export function ItemForgeModal({ open, forging, stage, item, source, onClose }: Props) {
  if (!open) return null;
  const enchanted = !!item?.enchantment;
  return (
    <div className={`item-forge-overlay ${forging ? 'is-forging' : 'is-revealed'}`} role="dialog" aria-modal="true" aria-label="离谱道具锻造机" onClick={onClose}>
      <section className="item-forge-panel" onClick={(event) => event.stopPropagation()}>
        <div className="forge-kicker">PIXEL ITEM FORGE / 001</div>
        {forging ? (
          <>
            {source && (
              <div className="forge-source-card">
                <div className="forge-source-art"><AssetImage card={source} /></div>
                <span>投入卡牌 · {source.name}</span>
              </div>
            )}
            <div className="forge-orb" aria-hidden="true"><span>✦</span></div>
            <h2>正在锻造道具</h2>
            <p className="forge-copy">{STAGE_COPY[stage]}</p>
            <div className="forge-progress is-indeterminate" aria-label="锻造进度"><span /></div>
            <p className="forge-lock-copy">AI 正在按这张卡牌取材，请稍候</p>
          </>
        ) : item ? (
          <>
            <div className={`item-reveal-glow ${enchanted ? 'has-enchantment' : ''}`} aria-hidden="true">
              <ItemPixelArt item={item} />
              {enchanted && <span className="enchant-spark">⚡</span>}
            </div>
            <span className="item-result-label">{enchanted ? '✨ 附魔成功 ✨' : '锻造完成'}</span>
            <h2>{item.name}</h2>
            <p className="item-result-description">{item.description}</p>
            {item.enchantment && (
              <div className="enchantment-result">
                <strong>⚡ {item.enchantment.name}</strong>
                <span>{item.enchantment.effect}</span>
              </div>
            )}
            <p className="item-source">来源卡牌：{item.sourceCardName ?? item.sourceTask}</p>
            {item.degraded && <p className="item-origin-note">AI 未响应，本件由研究所公版图样补齐。</p>}
            <button className="item-close-button" onClick={onClose}>收入道具箱</button>
          </>
        ) : null}
      </section>
    </div>
  );
}
