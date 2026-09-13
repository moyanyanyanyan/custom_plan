import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from './desktop';

export async function scheduleReminder(taskId: string, reminderAt: string | null) {
  if (!isDesktop) return;
  if (reminderAt) await invoke('schedule_task_reminder', { taskId, reminderAt });
  else await invoke('cancel_task_reminder', { taskId });
}

export async function cancelReminder(taskId: string) {
  if (isDesktop) await invoke('cancel_task_reminder', { taskId });
}
