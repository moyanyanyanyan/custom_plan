import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import type { Experiment } from '../types/experiment';

/** 纵向胶囊任务带：中央任务放大聚焦；点击切换完成，聚焦项可删除。 */
export function ExperimentList({ tasks, onToggle, onRemove }: {
  tasks: Experiment[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const previousCount = useRef(0);
  useEffect(() => {
    if (!tasks.length) { previousCount.current = 0; setFocusedId(null); return; }
    if (tasks.length > previousCount.current && previousCount.current > 0) {
      setFocusedId(tasks[tasks.length - 1].id);
    } else if (!focusedId || !tasks.some((task) => task.id === focusedId)) {
      setFocusedId(tasks[Math.floor((tasks.length - 1) / 2)].id);
    }
    previousCount.current = tasks.length;
  }, [focusedId, tasks]);
  const center = Math.max(0, tasks.findIndex((task) => task.id === focusedId));
  const move = (offset: number) => {
    if (!tasks.length) return;
    const next = Math.min(tasks.length - 1, Math.max(0, center + offset));
    setFocusedId(tasks[next].id);
  };
  const toggle = (id: string) => {
    setPulseId(id);
    window.setTimeout(() => setPulseId(null), 420);
    onToggle(id);
  };
  const remove = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task && window.confirm(`确认删除“${task.name}”吗？`)) onRemove(id);
  };
  return <section className="experiments" aria-labelledby="experiments-title">
    <header><h3 id="experiments-title">今日实验 <span>EXPERIMENTS</span></h3><span className="experiment-group">今日任务</span></header>
    <div className="task-belt" onWheel={(event) => {
      if (Math.abs(event.deltaY) > 8) move(event.deltaY > 0 ? 1 : -1);
    }} onKeyDown={(event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1);
      }
    }}>
      <button type="button" className="belt-arrow up" aria-label="上一个任务"
        disabled={center <= 0} onClick={() => move(-1)}>⌃</button>
      {tasks.map((task, index) => {
        if (Math.abs(index - center) > 2) return null;
        const focused = index === center;
        return <div key={task.id} role="button" tabIndex={0} aria-pressed={task.completed}
          onClick={() => focused ? toggle(task.id) : setFocusedId(task.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              focused ? toggle(task.id) : setFocusedId(task.id);
            }
          }}
          className={`task-pill depth-${Math.abs(index - center)} ${focused ? 'focused' : ''} ${task.completed ? 'completed' : ''} ${pulseId === task.id ? 'task-pulse' : ''}`}>
          <span className={`task-icon icon-${task.icon}`}><Icon name={task.completed ? 'check' : task.icon} size={focused ? 34 : 22} /></span>
          <span className="task-description"><h4>{task.name}</h4>{focused && <p><Icon name="clock" size={15} />预计用时 {task.minutes} 分钟</p>}</span>
          <span className="task-state">{task.completed ? '✓ 已完成' : '○ 未完成'}</span>
          {task.completed && focused && <span className="completion-stamp">采集完成</span>}
          {focused && <button type="button" className="task-delete" aria-label={`删除 ${task.name}`}
            onClick={(event) => { event.stopPropagation(); remove(task.id); }}>×</button>}
        </div>;
      })}
      {tasks.length === 0 && <p className="belt-empty">今天还没有实验，在上方添加一个吧</p>}
      <button type="button" className="belt-arrow down" aria-label="下一个任务"
        disabled={center >= tasks.length - 1} onClick={() => move(1)}>⌄</button>
    </div>
    <p className="belt-caption">今日的小小行动，都是发明的原料 <span>· 点击任务切换完成</span></p>
  </section>;
}
