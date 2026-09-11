import { useState } from 'react';
import type { ScheduledTask, Task, TaskDraft } from '../../types/task';
import { AddTaskControl } from './AddTaskControl';
import { LaterTaskSection } from './LaterTaskSection';
import { TaskRow } from './TaskRow';
import './today-task-board.css';

interface TodayTaskBoardProps {
  tasks: Task[];
  laterTasks: ScheduledTask[];
  dateKey: string;
  date: Date;
  pendingSlimeCount: number;
  onAdd: (draft: TaskDraft) => void;
  onToggle: (date: string, id: string) => void;
  onRemove: (date: string, id: string) => void;
  onPatch: (date: string, id: string, changes: Partial<Task>) => void;
  onReschedule: (from: string, to: string, id: string, changes?: Partial<Task>) => void;
  onMoveToday: (date: string, id: string) => void;
  onOpenSlimes: () => void;
}

/** 把任务、进度反馈与过夜任务入口收在同一张今日纸板中。 */
export function TodayTaskBoard({ tasks, laterTasks, dateKey, date, pendingSlimeCount, onAdd,
  onToggle, onRemove, onPatch, onReschedule, onMoveToday, onOpenSlimes }: TodayTaskBoardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const completedCount = tasks.filter((task) => task.completed).length;
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric',
  }).format(date).replace('/', '月') + '日';

  return <section className="today-board" aria-labelledby="today-board-title">
    <div className="board-decoration" aria-hidden="true">
      <span className="lab-code">LAB / DAILY-01</span>
      <span className="odd-note">异常指数：可控</span>
      <span className="sample-stamp">不稳定<br />样本</span>
      <span className="sample-watermark"><i /><i /></span>
    </div>
    <header className="today-board-header">
      <div><span className="board-eyebrow">DAILY RESEARCH</span>
        <h2 id="today-board-title">{dateLabel} <small>· 今天</small></h2></div>
      <span className="board-progress">今日完成 <strong>{completedCount}/{tasks.length}</strong></span>
    </header>
    <div className="energy-strip" aria-label="今日能量">
      <span><i className="energy-dot stable" />稳定余波 <strong>{completedCount}</strong></span>
      <span><i className="energy-dot stagnant" />停滞能量 <strong>{tasks.length - completedCount}</strong></span>
    </div>
    <AddTaskControl date={date} onAdd={onAdd} />
    <div className="today-list" role="list" aria-label="今日任务">
      {tasks.map((task) => <TaskRow key={task.id} task={task} dateKey={dateKey}
        todayKey={dateKey} open={expandedId === task.id}
        onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
        onToggle={() => onToggle(dateKey, task.id)}
        onPatch={(changes) => onPatch(dateKey, task.id, changes)}
        onReschedule={(date, changes) => onReschedule(dateKey, date, task.id, changes)}
        onRemove={() => onRemove(dateKey, task.id)} />)}
      {!tasks.length && <p className="today-empty">今天还没有任务，先登记一件小事吧</p>}
    </div>
    <LaterTaskSection tasks={laterTasks} todayKey={dateKey} expandedId={expandedId}
      onExpand={(id) => setExpandedId(expandedId === id ? null : id)} onPatch={onPatch}
      onReschedule={onReschedule}
      onRemove={onRemove} onMoveToday={onMoveToday} />
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
