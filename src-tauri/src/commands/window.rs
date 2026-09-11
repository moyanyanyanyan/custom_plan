use crate::{data::AvatarPositionStore, placement};
use tauri::{AppHandle, Manager, State, WebviewWindow};

fn authorize(window: &WebviewWindow) -> Result<(), String> {
    matches!(window.label(), "avatar" | "panel").then_some(())
        .ok_or_else(|| "Unknown window".into())
}

fn get_window(app: &AppHandle, label: &str) -> Result<WebviewWindow, String> {
    app.get_webview_window(label).ok_or_else(|| format!("Missing window: {label}"))
}

#[tauri::command]
pub async fn toggle_panel(
    app: AppHandle, window: WebviewWindow, positions: State<'_, AvatarPositionStore>,
) -> Result<(), String> {
    authorize(&window)?;
    let panel = get_window(&app, "panel")?;
    if panel.is_visible().map_err(|e| e.to_string())? {
        return panel.hide().map_err(|e| e.to_string());
    }
    let position = placement::place_panel(&get_window(&app, "avatar")?, &panel)?;
    positions.save(position)?;
    panel.show().map_err(|e| e.to_string())?;
    panel.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn minimize_panel(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    authorize(&window)?;
    let panel = get_window(&app, "panel")?;
    if panel.is_minimized().map_err(|e| e.to_string())? {
        panel.unminimize().map_err(|e| e.to_string())?;
        return panel.set_focus().map_err(|e| e.to_string());
    }
    panel.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drag_panel(window: WebviewWindow) -> Result<(), String> {
    if window.label() != "panel" { return Err("Only panel can use this drag command".into()); }
    window.start_dragging().map_err(|e| e.to_string())
}

/** 系统拖动不会稳定派发网页松手事件，因此等待真实鼠标键释放后再吸附。 */
#[tauri::command]
pub async fn drag_avatar(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    if window.label() != "avatar" { return Err("Only avatar can be dragged".into()); }
    get_window(&app, "panel")?.hide().map_err(|e| e.to_string())?;
    window.start_dragging().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(std::time::Duration::from_millis(100));
        #[cfg(windows)]
        while unsafe { windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(1) } < 0 {
            std::thread::sleep(std::time::Duration::from_millis(16));
        }
        let position = placement::settle_avatar(&window, 24.0)?;
        app.state::<AvatarPositionStore>().save(position)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn exit_app(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    authorize(&window)?;
    app.exit(0);
    Ok(())
}
