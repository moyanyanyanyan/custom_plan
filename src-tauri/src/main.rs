#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod geometry;
#[cfg(test)]
mod geometry_tests;
mod placement;

use tauri::Manager;

/** 隐藏窗口完成定位后再展示，避免启动时在屏幕中央闪现。 */
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::toggle_panel,
            commands::hide_panel,
            commands::drag_avatar,
            commands::drag_panel,
            commands::exit_app
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "panel" {
                    // 系统关闭只收起面板，保留头像再次展开所需的窗口实例。
                    api.prevent_close();
                    if let Err(error) = window.hide() {
                        eprintln!("Failed to hide panel: {error}");
                    }
                } else {
                    window.app_handle().exit(0);
                }
            }
        })
        .setup(|app| {
            let avatar = app
                .get_webview_window("avatar")
                .ok_or("Avatar window missing")?;
            placement::initialize(&avatar)?;
            avatar.show()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Failed to start Absurd Invention Lab");
}
