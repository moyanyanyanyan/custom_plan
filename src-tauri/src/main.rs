#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod commands;
mod ai;
mod data;
mod geometry;
#[cfg(test)]
mod geometry_tests;
mod placement;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(avatar) = app.get_webview_window("avatar") {
                let _ = avatar.show();
                let _ = avatar.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            let position_store = data::AvatarPositionStore::open(data_dir.join("avatar-position.json"))?;
            let saved_position = position_store.load()?;
            app.manage(data::AppStore::open(data_dir)?);
            app.manage(position_store);
            if let Ok(mut current) = app.state::<data::AppStore>().load() {
                let latest_revision = current.revision;
                let missing = current.settings.get("stepfunApiKey")
                    .and_then(|v| v.as_str())
                    .map(|s| s.is_empty())
                    .unwrap_or(true);
                if missing {
                    // key 解析链（DSH 凭据 → 内嵌默认）已下沉到 ai::stepfun::stored_key，
                    // 这里只是首次启动就把它落盘，保证用户不打开设置也能立刻用 AI。
                    let key = crate::ai::stepfun::fallback_api_key();
                    {
                        if !current.settings.is_object() {
                            current.settings = serde_json::Value::Object(Default::default());
                        }
                        if let Some(object) = current.settings.as_object_mut() {
                            object.insert("stepfunApiKey".into(), serde_json::Value::String(key));
                            let _ = app.state::<data::AppStore>().save(current, latest_revision);
                        }
                    }
                }
            }
            let avatar = app.get_webview_window("avatar").ok_or("Avatar window missing")?;
            let initial_position = placement::initialize(&avatar, saved_position)?;
            app.state::<data::AvatarPositionStore>().save(initial_position)?;
            if let Some(index) = std::env::args().position(|arg| arg == "--fire-reminder") {
                if let Some(task_id) = std::env::args().nth(index + 1) {
                    commands::reminder::fire_task_reminder_now(app.handle(), &app.state::<data::AppStore>(), &task_id)?;
                    app.handle().exit(0);
                }
            }
            avatar.show()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::toggle_panel,
            commands::window::minimize_panel,
            commands::window::drag_avatar,
            commands::window::drag_panel,
            commands::window::set_panel_mode,
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
            commands::ai::generate_item_copy,
            commands::ai::generate_item_art,
            commands::ai::generate_slime_copy,
            commands::ai::suggest_task_steps,
            commands::ai::save_stepfun_api_key,
            commands::notification::ensure_notification_permission,
            commands::notification::send_task_notification,
            commands::reminder::schedule_task_reminder,
            commands::reminder::cancel_task_reminder,
            commands::reminder::fire_task_reminder
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 系统关闭表示用户要结束应用，两个窗口必须一起退出。
                window.app_handle().exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("Failed to start Absurd Invention Lab");
}
