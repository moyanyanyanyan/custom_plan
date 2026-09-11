import { useCallback, useEffect, useRef, useState } from 'react';
import { ONBOARDING_MASCOT, ONBOARDING_STEPS } from '../../constants/onboarding';
import './onboarding.css';

interface OnboardingGuideProps {
  /** 是否显示指引。 */
  open: boolean;
  /** 走完或跳过时调用：调用方负责持久化 onboardingCompleted 并关闭。 */
  onFinish: () => void;
}

/**
 * 新手指引覆盖层：欢迎屏 + 6 个聚光灯指引 + 收尾屏。
 * 聚光灯目标通过 [data-guide="..."] 锚点定位，空间不足时气泡自动翻转。
 */
export function OnboardingGuide({ open, onFinish }: OnboardingGuideProps) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // 重新打开时回到第一屏
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = ONBOARDING_STEPS[index];
  const isLast = index === ONBOARDING_STEPS.length - 1;

  /** 根据当前步骤计算聚光灯与气泡位置。 */
  const position = useCallback(() => {
    const card = cardRef.current;
    const spotlight = spotlightRef.current;
    if (!card || !spotlight) return;
    const panel = document.querySelector('.panel-shell') as HTMLElement | null;
    if (!panel) return;

    // 居中屏（欢迎/收尾）
    if (!step.target) {
      spotlight.style.opacity = '0';
      card.className = 'guide-card centered';
      const cw = card.offsetWidth || 408;
      const ch = card.offsetHeight || 220;
      card.style.left = `${Math.round((panel.clientWidth - cw) / 2)}px`;
      card.style.top = `${Math.round((panel.clientHeight - ch) / 2)}px`;
      return;
    }

    const target = panel.querySelector(step.target) as HTMLElement | null;
    if (!target) {
      spotlight.style.opacity = '0';
      return;
    }

    const pr = panel.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const r = {
      top: tr.top - pr.top,
      left: tr.left - pr.left,
      bottom: tr.bottom - pr.top,
      width: tr.width,
      height: tr.height,
    };
    const pad = 6;
    spotlight.style.opacity = '1';
    spotlight.style.top = `${r.top - pad}px`;
    spotlight.style.left = `${r.left - pad}px`;
    spotlight.style.width = `${r.width + pad * 2}px`;
    spotlight.style.height = `${r.height + pad * 2}px`;

    // 气泡定位：优先按 placement，空间不够则翻转
    const cardW = 432;
    const gap = 12;
    const left = Math.max(24, Math.min(r.left, panel.clientWidth - cardW - 24));
    let placement = step.placement ?? 'bottom';
    const chEst = card.offsetHeight || 210;
    if (placement === 'bottom' && r.bottom + gap + chEst > panel.clientHeight - 8) {
      placement = 'top';
    }
    if (placement === 'top' && r.top - gap - chEst < 8) {
      placement = 'bottom';
    }

    let top: number;
    if (placement === 'bottom') {
      top = r.bottom + gap;
      card.className = 'guide-card arrow-top';
    } else {
      top = Math.max(8, r.top - gap - chEst);
      card.className = 'guide-card arrow-bottom';
    }
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }, [step]);

  // 打开/切屏后重排位置（等布局与图片加载）
  useEffect(() => {
    if (!open) return;
    position();
    const timers = [
      window.setTimeout(position, 80),
      window.setTimeout(position, 250),
    ];
    window.addEventListener('resize', position);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('resize', position);
    };
  }, [open, index, position]);

  // 键盘导航
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setIndex((i) => Math.min(i + 1, ONBOARDING_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Escape') {
        onFinish();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onFinish]);

  if (!open) return null;

  const goNext = () => {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  };
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="guide-layer" role="dialog" aria-modal="true" aria-label="新手指引">
      <div className="guide-dim" />
      <div className="guide-spotlight" ref={spotlightRef} />
      <div className="guide-card" ref={cardRef}>
        <div className="guide-head">
          <img className="guide-mascot" src={ONBOARDING_MASCOT} alt="看板助手小离谱" />
          <div className="guide-text">
            <span className="guide-step-tag">{step.tag}</span>
            <h3 className="guide-title">{step.title}</h3>
            <p className="guide-body">{step.body}</p>
            {step.illustration && (
              <img className="guide-illustration" src={step.illustration} alt={`${step.title}配图`} />
            )}
          </div>
        </div>
        <div className="guide-footer">
          <button className="guide-skip" onClick={onFinish} disabled={isLast}>
            跳过指引
          </button>
          <div className="guide-dots">
            {ONBOARDING_STEPS.map((s, i) => (
              <i
                key={s.key}
                className={i === index ? 'on' : ''}
                onClick={() => setIndex(i)}
                role="button"
                aria-label={`跳到第${i + 1}屏`}
              />
            ))}
          </div>
          <div className="guide-nav">
            <button className="guide-btn" disabled={index === 0} onClick={goPrev}>
              上一步
            </button>
            <button className="guide-btn primary" onClick={goNext}>
              {isLast ? '开始第一项实验 ✓' : index === 0 ? '开始参观' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
