import { useState } from 'react';
import type { SlimeCompanion } from '../../types/slime';
import './slimes.css';

interface SlimeDrawerProps {
  slime: SlimeCompanion;
  onFocus: (date: string, id: string) => void;
  onComplete: (id: string) => void;
  onReschedule: (from: string, to: string, id: string) => void;
  onSplit: (date: string, id: string) => void;
  onDiscard: (id: string) => void;
}

/** 史莱姆用自己的身体收纳旧任务，让处理遗留事项更像整理而不是受罚。 */
export function SlimeDrawer({ slime, onFocus, onComplete, onReschedule,
  onSplit, onDiscard }: SlimeDrawerProps) {
  const [open, setOpen] = useState(false);
  const count = slime.meals.length;
  const message = count === 0 ? '肚子空空，今天很轻盈'
    : count < 4 ? `我替你收好了 ${count} 件事`
      : '肚子有点满，我们挑一件看看？';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  return <section className={`slime-drawer ${slime.mood} ${open ? 'open' : ''}`}>
    <button className="slime-handle" onClick={() => setOpen(!open)}
      aria-expanded={open} aria-controls="slime-stomach">
      <span className="slime-face" aria-hidden="true"><i /><i /><b /></span>
      <span className="slime-copy"><strong>{message}</strong><small>史莱姆抽屉</small></span>
      <span className="slime-count" aria-label={`${count} 件旧任务`}>{count}</span>
      <span className="slime-chevron" aria-hidden="true">⌄</span>
    </button>
    <div className="slime-stomach" id="slime-stomach" hidden={!open}>
      {count === 0 && <p>没有需要消化的旧任务，陪我休息一下吧。</p>}
      {slime.meals.map((meal) => <article key={meal.taskId}>
        <div><strong>{meal.taskName}</strong><small>住了 {meal.wanderingDays} 天</small></div>
        <nav aria-label={`处理${meal.taskName}`}>
          <button onClick={() => onFocus(meal.taskDate, meal.taskId)}>做 5 分钟</button>
          <button onClick={() => onComplete(meal.taskId)}>完成消化</button>
          <button onClick={() => onReschedule(meal.taskDate, tomorrowKey, meal.taskId)}>明天再做</button>
          <button onClick={() => onSplit(meal.taskDate, meal.taskId)}>拆小一点</button>
          <button onClick={() => onDiscard(meal.taskId)}>放下任务</button>
        </nav>
      </article>)}
    </div>
  </section>;
}
