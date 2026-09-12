import { useState } from 'react';
import type { RepeatRule, Task } from '../../types/task';
import { formatTaskDate } from '../../utils/taskParser';
import { TaskDetails } from './TaskDetails';
import { TaskRowActions } from './TaskRowActions';
import { ensureNotificationPermission } from '../../utils/notifications';

const repeatLabels: Record<RepeatRule, string> = { daily: '每天', weekly: '每周', weekdays: '工作日' };

export function TaskRow({ task, dateKey, todayKey, future = false, open, onExpand, onToggle, onPatch,
  onReschedule, onRemove, onMoveToday, newlyAdded = false }: { task: Task; dateKey: string; todayKey: string; future?: boolean;
  newlyAdded?: boolean;
  open: boolean; onExpand: () => void;
  onToggle: () => void; onPatch: (changes: Partial<Task>) => void; onRemove: () => void;
  onReschedule: (date: string, changes?: Partial<Task>) => void;
  onMoveToday?: () => void }) {
  const [pulse, setPulse] = useState(false);
  const dateLabel = formatTaskDate(dateKey, todayKey);
  const schedule = future && task.scheduledTime
    ? `${dateLabel} ${task.scheduledTime}` : task.scheduledTime || dateLabel;
  const remove = () => { if (window.confirm(`确认删除“${task.name}”吗？`)) onRemove(); };
  const setReminder = (value: string) => {
    onPatch({ reminderAt: value ? new Date(value).toISOString() : null, remindedAt: null });
    if (value) void ensureNotificationPermission().catch(() => undefined);
  };
  const setRepeat = (value: RepeatRule | null) => onPatch({ repeatRule: value,
    seriesId: value ? task.seriesId ?? crypto.randomUUID() : null });

  const toggle = () => {
    setPulse(true); window.setTimeout(() => setPulse(false), 420); onToggle();
  };
  return <article role="listitem" className={`task-entry ${future ? 'future-task' : ''} ${task.completed ? 'completed' : ''} ${open ? 'focused' : ''} ${pulse ? 'task-pulse' : ''} ${newlyAdded ? 'task-enter' : ''}`}>
    <div className="task-entry-row">
      {future ? <span className="future-pin" aria-hidden="true" />
        : <button type="button" className="task-check" aria-label={`${task.completed ? '已完成' : '完成'} ${task.name}`}
          aria-pressed={task.completed} disabled={task.completed} onClick={toggle}>{task.completed ? '✓' : ''}</button>}
      <button type="button" className="task-title" aria-label={task.name} onClick={onExpand}>
        <span>{task.name}</span>
        <small className="task-meta"><span>{schedule}</span>
          {task.repeatRule && <span className="repeat-meta">循环 · {repeatLabels[task.repeatRule]}</span>}
          {future && task.reminderAt && <span>已提醒</span>}
        </small>
      </button>
      {future ? <button type="button" className="future-open" aria-label={`查看 ${task.name}`}
        onClick={onExpand}>›</button> : <TaskRowActions taskName={task.name}
        reminderAt={task.reminderAt} repeatRule={task.repeatRule}
        onReminderChange={setReminder} onRepeatChange={setRepeat} onExpand={onExpand} />}
    </div>
    {open && <><TaskDetails task={task} dateKey={dateKey} onPatch={onPatch}
      onReschedule={onReschedule} /><div className="task-more-actions">
      {future && <button type="button" onClick={onMoveToday}>移到今天</button>}
      <button type="button" className="danger" onClick={remove}>删除任务</button>
    </div></>}
  </article>;
}
