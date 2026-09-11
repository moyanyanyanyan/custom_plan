import type { ScheduledTask, Task } from '../../types/task';
import { TaskRow } from './TaskRow';

export function LaterTaskSection({ tasks, todayKey, expandedId, recentlyAddedTaskId, onExpand, onPatch, onReschedule, onRemove, onMoveToday }: {
  tasks: ScheduledTask[]; todayKey: string;
  recentlyAddedTaskId?: string | null;
  expandedId: string | null; onExpand: (id: string) => void;
  onPatch: (date: string, id: string, changes: Partial<Task>) => void;
  onReschedule: (from: string, to: string, id: string, changes?: Partial<Task>) => void;
  onRemove: (date: string, id: string) => void;
  onMoveToday: (date: string, id: string) => void;
}) {
  if (!tasks.length) return null;
  return <details className="later-section"><summary><span><i aria-hidden="true" />稍后</span>
    <small>{tasks.length} 项</small><b aria-hidden="true">⌃</b></summary>
    <div>{tasks.map(({ task, dateKey }) => <TaskRow key={task.id} task={task}
      dateKey={dateKey} todayKey={todayKey} future open={expandedId === task.id}
      newlyAdded={recentlyAddedTaskId === task.id}
      onExpand={() => onExpand(task.id)} onToggle={() => undefined}
      onPatch={(changes) => onPatch(dateKey, task.id, changes)}
      onReschedule={(date, changes) => onReschedule(dateKey, date, task.id, changes)}
      onRemove={() => onRemove(dateKey, task.id)}
      onMoveToday={() => onMoveToday(dateKey, task.id)} />)}</div>
  </details>;
}
