import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ONBOARDING_STEPS } from '../../constants/onboarding';
import './onboarding.css';

interface OnboardingGuideProps { open: boolean; onFinish: () => void; }
const highlightText = (body: string, words: string[] = []) => {
  if (!words.length) return body;
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return body.split(new RegExp(`(${escaped.join('|')})`, 'g')).map((part, i) => words.includes(part) ? <mark key={i}>{part}</mark> : part);
};

/** 首次启动引导；目标缺失时退化为居中卡片，不阻断页面使用。 */
export function OnboardingGuide({ open, onFinish }: OnboardingGuideProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const step = ONBOARDING_STEPS[index];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);
  const locate = useCallback(() => {
    setTargetRect(step.target ? document.querySelector(step.target)?.getBoundingClientRect() ?? null : null);
  }, [step]);
  useEffect(() => { if (open) { setIndex(0); locate(); } }, [open]);
  useEffect(() => {
    if (!open) return;
    locate(); window.addEventListener('resize', locate); window.addEventListener('scroll', locate, true);
    return () => { window.removeEventListener('resize', locate); window.removeEventListener('scroll', locate, true); };
  }, [open, locate]);
  useLayoutEffect(() => {
    if (!open || !targetRect || !cardRef.current) { setCardPosition(null); return; }
    const gap = 16, edge = 16, card = cardRef.current.getBoundingClientRect();
    const centeredLeft = targetRect.left + (targetRect.width - card.width) / 2;
    const candidates = [
      { top: targetRect.bottom + gap, left: centeredLeft },
      { top: targetRect.top - card.height - gap, left: centeredLeft },
    ];
    const fits = ({ top, left }: { top:number; left:number }) => top >= edge && left >= edge
      && top + card.height <= window.innerHeight - edge && left + card.width <= window.innerWidth - edge;
    const selected = candidates.find(fits) ?? candidates
      .map(({ top, left }) => ({ top: Math.min(window.innerHeight-card.height-edge, Math.max(edge, top)), left: Math.min(window.innerWidth-card.width-edge, Math.max(edge, left)) }))
      .sort((a, b) => Math.abs(a.left-centeredLeft)-Math.abs(b.left-centeredLeft))[0];
    setCardPosition(selected);
  }, [open, targetRect, index]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish();
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(ONBOARDING_STEPS.length - 1, value + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onFinish]);
  if (!open) return null;
  const last = index === ONBOARDING_STEPS.length - 1;
  const first = index === 0;
  const next = () => last ? onFinish() : setIndex((value) => value + 1);
  const previous = () => setIndex((value) => Math.max(0, value - 1));
  return <div className="onboarding-layer" role="dialog" aria-modal="true" aria-label="新手指引">
    {targetRect && <div className="onboarding-spotlight" style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }} />}
    <section ref={cardRef} className={`onboarding-card${targetRect ? ' positioned' : ' centered'}`} style={cardPosition ?? undefined}>
      <header className="onboarding-header"><div><strong>新手指引 · 可视化交互原型</strong><small>用 <kbd>←</kbd> <kbd>→</kbd> 切换步骤，<kbd>Esc</kbd> 跳过</small></div><span className="onboarding-count">{index + 1} / {ONBOARDING_STEPS.length}</span></header>
      <div className="onboarding-content"><img className="onboarding-avatar" src="/onboarding/avatar.jpg" alt="小离谱头像" /><div className="onboarding-copy"><div className="onboarding-step-label">STEP {String(index + 1).padStart(2, '0')} / {step.title}</div><h2>{step.title}</h2><p>{highlightText(step.body, step.highlights)}</p></div></div>
      <footer className="onboarding-actions"><button type="button" className="skip" onClick={onFinish}>跳过指引</button><div className="onboarding-dots">{ONBOARDING_STEPS.map((item, itemIndex) => <span key={item.key} className={itemIndex === index ? 'active' : ''} />)}</div><div className="onboarding-nav"><button type="button" onClick={previous} disabled={first} aria-label="上一步">上一步</button><button type="button" className="primary" onClick={next} aria-label={last ? '开始使用' : '下一步'}>{last ? '开始使用' : '下一步'}</button></div></footer>
    </section>
  </div>;
}
