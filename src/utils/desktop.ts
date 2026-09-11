import { invoke, isTauri } from '@tauri-apps/api/core';

export const isDesktop = isTauri();

/** 浏览器只预览静态面板，窗口操作仅发送给本地桌面进程。 */
export async function desktopCommand(command: 'toggle_panel' | 'hide_panel' | 'minimize_panel' | 'drag_avatar' | 'drag_panel' | 'exit_app' | 'set_panel_mode', args?: Record<string, unknown>) {
  if (isDesktop) await invoke(command, args);
}

export function setPanelMode(mode: 'standard' | 'compact') {
  return desktopCommand('set_panel_mode', { mode });
}
