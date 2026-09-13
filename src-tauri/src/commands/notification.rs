use tauri::AppHandle;
use tauri_plugin_notification::{NotificationExt, PermissionState};

#[tauri::command]
pub fn ensure_notification_permission(app: AppHandle) -> Result<bool, String> {
    let notification = app.notification();
    let current = notification.permission_state().map_err(|error| error.to_string())?;
    if current == PermissionState::Granted { return Ok(true); }
    if current == PermissionState::Denied { return Ok(false); }
    Ok(notification.request_permission().map_err(|error| error.to_string())?
        == PermissionState::Granted)
}

#[tauri::command]
pub fn send_task_notification(app: AppHandle, title: String) -> Result<(), String> {
    app.notification().builder().title("离谱发明所 · 任务提醒")
        .body(title).show().map_err(|error| error.to_string())
}
