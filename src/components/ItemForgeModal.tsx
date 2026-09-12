import type { PixelItem } from '../types/item';
import './items.css';

type Props = {
  open: boolean;
  forging: boolean;
  item: PixelItem | null;
  onClose: () => void;
};

export function ItemForgeModal({ open, forging, item, onClose }: Props) {
  if (!open) return null;
  const enchanted = !!item?.enchantment;
  return (
    <div className={`item-forge-overlay ${forging ? 'is-forging' : 'is-revealed'}`} role="dialog" aria-modal="true" aria-label="离谱道具锻造机" onClick={onClose}>
      <section className="item-forge-panel" onClick={(event) => event.stopPropagation()}>
        <div className="forge-kicker">PIXEL ITEM FORGE / 001</div>
        {forging ? (
          <>
            <div className="forge-orb" aria-hidden="true"><span>✦</span></div>
            <h2>正在锻造今日道具</h2>
            <p className="forge-copy">把今天完成的任务，压缩成一件小小的像素纪念品…</p>
            <div className="forge-progress" aria-label="锻造进度"><span /></div>
            <p className="forge-lock-copy">锻造期间请稍候，研究所正在全力运转</p>
          </>
        ) : item ? (
          <>
            <div className={`item-reveal-glow ${enchanted ? 'has-enchantment' : ''}`} aria-hidden="true">
              <div className="item-pixel-icon">{item.name.slice(0, 1)}</div>
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
            <p className="item-source">来源任务：{item.sourceTask}</p>
            <button className="item-close-button" onClick={onClose}>收入道具箱</button>
          </>
        ) : null}
      </section>
    </div>
  );
}
