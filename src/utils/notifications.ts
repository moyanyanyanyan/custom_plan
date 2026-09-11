import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from './desktop';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isDesktop) return false;
  return invoke<boolean>('ensure_notification_permission');
}

export async function sendTaskNotification(title: string): Promise<void> {
  if (!isDesktop) return;
  await invoke('send_task_notification', { title });
}
