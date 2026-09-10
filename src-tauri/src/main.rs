#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod ai;
mod data;
mod geometry;
#[cfg(test)]
mod geometry_tests;
mod placement;

use tauri::Manager;

/** 隐藏窗口完成定位后再展示，避免启动时在屏幕中央闪现。 */
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            app.manage(data::AppStore::open(data_dir)?);
            let avatar = app.get_webview_window("avatar").ok_or("Avatar window missing")?;
            placement::initialize(&avatar)?;
            avatar.show()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::toggle_panel,
            commands::window::hide_panel,
            commands::window::drag_avatar,
            commands::window::drag_panel,
            commands::window::exit_app,
            commands::data::load_app_data,
            commands::data::save_app_data,
            commands::data::claim_daily_card,
            commands::data::update_card,
            commands::data::import_legacy_data,
            commands::data::load_asset_data_url,
            commands::data::save_user_asset,
            commands::ai::generate_card_copy,
            commands::ai::generate_card_art,
            commands::ai::generate_slime_copy
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
        .run(tauri::generate_context!())
        .expect("Failed to start Absurd Invention Lab");
}
