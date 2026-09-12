import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppData } from './useAppData';
import { ensureNotificationPermission, sendTaskNotification } from '../utils/notifications';
import { scheduleReminder } from '../utils/reminderScheduler';

/** 只标记成功送达的提醒，失败任务会在下次扫描时继续尝试。 */
export function useTaskReminders() {
  const { data, ready, update } = useAppData();
  const [error, setError] = useState('');
  const scanning = useRef(false);
  const scheduling = useRef(Promise.resolve());
  const previousReminders = useRef(new Map<string, string>());
  const reminderConfig = Object.values(data.tasksByDate).flat()
    .filter((task) => !task.completed && !task.remindedAt && task.reminderAt)
    .map((task) => `${task.id}:${task.reminderAt}`)
    .sort().join('|');
  const scan = useCallback(async () => {
    if (!ready || scanning.current) return;
    scanning.current = true;
    try {
      const now = Date.now();
      const due = Object.values(data.tasksByDate).flat().filter((task) =>
        !task.completed && !task.remindedAt && task.reminderAt
        && new Date(task.reminderAt).getTime() <= now);
      if (!due.length) return;
      if (!await ensureNotificationPermission()) {
        setError('系统通知权限未开启，任务提醒已保留'); return;
      }
      const sent: string[] = [];
      for (const task of due) {
        await sendTaskNotification(task.name);
        sent.push(task.id);
      }
      const remindedAt = new Date().toISOString();
      await update((current) => ({ ...current, tasksByDate: Object.fromEntries(
        Object.entries(current.tasksByDate).map(([date, tasks]) => [date, tasks.map((task) =>
          sent.includes(task.id) ? { ...task, remindedAt } : task)]),
      ) }));
      setError('');
    } catch (reason) { setError(`提醒发送失败：${String(reason)}`); }
    finally { scanning.current = false; }
  }, [data.tasksByDate, ready, update]);

  useEffect(() => {
    if (ready) scheduling.current = scheduling.current.then(async () => {
      const active = Object.values(data.tasksByDate).flat()
        .filter((task) => !task.completed && !task.remindedAt && task.reminderAt);
      const next = new Map(active.map((task) => [task.id, task.reminderAt as string]));
      for (const [taskId, reminderAt] of previousReminders.current) {
        if (!next.has(taskId)) await scheduleReminder(taskId, null);
        else if (next.get(taskId) !== reminderAt) await scheduleReminder(taskId, next.get(taskId)!);
      }
      for (const [taskId, reminderAt] of next) {
        if (!previousReminders.current.has(taskId)) await scheduleReminder(taskId, reminderAt);
      }
      previousReminders.current = next;
    }).catch(() => undefined);
  }, [ready, reminderConfig]);

  useEffect(() => {
    void scan();
    const timer = window.setInterval(() => void scan(), 30_000);
    const onFocus = () => void scan();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [scan]);
  return { reminderError: error };
}
