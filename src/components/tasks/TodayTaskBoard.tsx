import { useState } from 'react';
import type { Task } from '../../types/task';
import { AddTaskControl } from './AddTaskControl';
import './today-task-board.css';

interface TodayTaskBoardProps {
  tasks: Task[];
  date: Date;
  pendingSlimeCount: number;
  onAdd: (name: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenSlimes: () => void;
}

/** 把任务、进度反馈与过夜任务入口收在同一张今日纸板中。 */
export function TodayTaskBoard({ tasks, date, pendingSlimeCount, onAdd, onToggle,
  onRemove, onOpenSlimes }: TodayTaskBoardProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const completedCount = tasks.filter((task) => task.completed).length;
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric',
  }).format(date).replace('/', '月') + '日';

  const toggle = (id: string) => {
    setPulseId(id);
    window.setTimeout(() => setPulseId(null), 420);
    onToggle(id);
  };

  const remove = (task: Task) => {
    if (window.confirm(`确认删除“${task.name}”吗？`)) onRemove(task.id);
  };

  return <section className="today-board" aria-labelledby="today-board-title">
    <header className="today-board-header">
      <div><span className="board-eyebrow">DAILY RESEARCH</span>
        <h2 id="today-board-title">{dateLabel} <small>· 今天</small></h2></div>
      <span className="board-progress">今日完成 <strong>{completedCount}/{tasks.length}</strong></span>
    </header>
    <div className="energy-strip" aria-label="今日能量">
      <span><i className="energy-dot stable" />稳定余波 <strong>{completedCount}</strong></span>
      <span><i className="energy-dot stagnant" />停滞能量 <strong>{tasks.length - completedCount}</strong></span>
    </div>
    <AddTaskControl onAdd={onAdd} variant="inline" />
    <div className="today-list" role="list" aria-label="今日任务">
      {tasks.map((task) => <article role="listitem" key={task.id}
        className={`today-row ${task.completed ? 'completed' : ''} ${focusedId === task.id ? 'focused' : ''} ${pulseId === task.id ? 'task-pulse' : ''}`}>
        <button type="button" className="task-check" aria-label={`${task.completed ? '取消完成' : '完成'} ${task.name}`}
          aria-pressed={task.completed} onClick={() => toggle(task.id)}>
          <span aria-hidden="true">{task.completed ? '✓' : ''}</span>
        </button>
        <button type="button" className="task-copy" onClick={() => setFocusedId(task.id)}>
          <span>{task.name}</span><small>{task.completed ? '已采集' : '待完成'}</small>
        </button>
        {task.completed && <span className="row-stamp" aria-hidden="true">采集完成</span>}
        <button type="button" className="row-delete" aria-label={`删除 ${task.name}`}
          onClick={() => remove(task)}>×</button>
      </article>)}
      {!tasks.length && <p className="today-empty">今天还没有任务，先登记一件小事吧</p>}
    </div>
    <footer className="today-board-footer">
      <div className="daily-scale" aria-label={`今日刻度，完成 ${completedCount} 项，共 ${tasks.length} 项`}>
        <span>今日刻度</span>{tasks.slice(0, 10).map((task) =>
          <i key={task.id} className={task.completed ? 'done' : ''} />)}
        {tasks.length > 10 && <small>共 {tasks.length} 项</small>}
      </div>
      {pendingSlimeCount > 0
        ? <button type="button" className="slime-corner active" onClick={onOpenSlimes}
          aria-label={`打开史莱姆图鉴，有 ${pendingSlimeCount} 件没做完的事`}>
          <SlimeShape awake /><span>史莱姆捡到了 {pendingSlimeCount} 件没做完的事</span>
        </button>
        : <div className="slime-corner" aria-label="没有过夜任务，史莱姆正在睡觉">
          <SlimeShape /><span>没有过夜任务，史莱姆睡着了</span>
        </div>}
    </footer>
  </section>;
}

function SlimeShape({ awake = false }: { awake?: boolean }) {
  return <span className={`mini-slime ${awake ? 'awake' : ''}`} aria-hidden="true">
    <i /><i /><b>{awake ? '' : 'z'}</b>
  </span>;
}
