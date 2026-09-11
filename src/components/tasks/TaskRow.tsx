import { useState } from 'react';
import type { RepeatRule, Task } from '../../types/task';
import { formatTaskDate } from '../../utils/taskParser';
import { TaskDetails } from './TaskDetails';
import { ensureNotificationPermission } from '../../utils/notifications';

const repeatLabels: Record<RepeatRule, string> = { daily: '每天', weekly: '每周', weekdays: '工作日' };

export function TaskRow({ task, dateKey, todayKey, future = false, open, onExpand, onToggle, onPatch,
  onReschedule, onRemove, onMoveToday }: { task: Task; dateKey: string; todayKey: string; future?: boolean;
  open: boolean; onExpand: () => void;
  onToggle: () => void; onPatch: (changes: Partial<Task>) => void; onRemove: () => void;
  onReschedule: (date: string, changes?: Partial<Task>) => void;
  onMoveToday?: () => void }) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const dateLabel = formatTaskDate(dateKey, todayKey);
  const schedule = future && task.scheduledTime
    ? `${dateLabel} ${task.scheduledTime}` : task.scheduledTime || dateLabel;
  const remove = () => { if (window.confirm(`确认删除“${task.name}”吗？`)) onRemove(); };
  const setReminder = (value: string) => {
    onPatch({ reminderAt: value ? new Date(value).toISOString() : null, remindedAt: null });
    if (value) void ensureNotificationPermission().catch(() => undefined);
  };
  const reminderValue = task.reminderAt ? new Date(new Date(task.reminderAt).getTime()
    - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';

  const toggle = () => {
    setPulse(true); window.setTimeout(() => setPulse(false), 420); onToggle();
  };
  return <article role="listitem" className={`task-entry ${task.completed ? 'completed' : ''} ${open ? 'focused' : ''} ${pulse ? 'task-pulse' : ''}`}>
    <div className="task-entry-row">
      {future ? <span className="future-pin" aria-hidden="true" />
        : <button type="button" className="task-check" aria-label={`${task.completed ? '取消完成' : '完成'} ${task.name}`}
          aria-pressed={task.completed} onClick={toggle}>{task.completed ? '✓' : ''}</button>}
      <button type="button" className="task-title" onClick={onExpand}>
        <span>{task.name}</span>{(task.notes || task.steps.length > 0) && <small>⌄</small>}</button>
      <span className="task-schedule">{schedule}</span>
      <div className="row-actions">
        <button type="button" onClick={() => setReminderOpen(!reminderOpen)}>{task.reminderAt ? '提醒✓' : '提醒'}</button>
        <select aria-label={`${task.name}的重复规则`} value={task.repeatRule ?? ''}
          onChange={(event) => onPatch({ repeatRule: event.target.value as RepeatRule || null,
            seriesId: event.target.value ? task.seriesId ?? crypto.randomUUID() : null })}>
          <option value="">不重复</option><option value="daily">每天</option>
          <option value="weekly">每周</option><option value="weekdays">工作日</option>
        </select>
        <button type="button" onClick={onExpand}>更多</button>
      </div>
    </div>
    {task.repeatRule && <span className="row-meta">↻ {repeatLabels[task.repeatRule]}</span>}
    {reminderOpen && <div className="reminder-editor"><input type="datetime-local"
      aria-label={`${task.name}的提醒时间`} value={reminderValue}
      onChange={(event) => setReminder(event.target.value)} /></div>}
    {open && <><TaskDetails task={task} dateKey={dateKey} onPatch={onPatch}
      onReschedule={onReschedule} /><div className="task-more-actions">
      {future && <button type="button" onClick={onMoveToday}>移到今天</button>}
      <button type="button" className="danger" onClick={remove}>删除任务</button>
    </div></>}
  </article>;
}
