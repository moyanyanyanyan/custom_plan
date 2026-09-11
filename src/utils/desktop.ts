import { invoke, isTauri } from '@tauri-apps/api/core';

export const isDesktop = isTauri();

/** 浏览器只预览静态面板，窗口操作仅发送给本地桌面进程。 */
export async function desktopCommand(command: 'toggle_panel' | 'hide_panel' | 'minimize_panel' | 'drag_avatar' | 'drag_panel' | 'exit_app') {
  if (isDesktop) await invoke(command);
}
