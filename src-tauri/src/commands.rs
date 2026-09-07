use crate::placement;
use tauri::{AppHandle, Manager, WebviewWindow};

/** 仅允许本地预定义窗口调用，避免引入通用窗口管理接口。 */
fn authorize(window: &WebviewWindow) -> Result<(), String> {
    if matches!(window.label(), "avatar" | "panel") {
        Ok(())
    } else {
        Err("Unknown window".into())
    }
}

fn get_window(app: &AppHandle, label: &str) -> Result<WebviewWindow, String> {
    app.get_webview_window(label)
        .ok_or_else(|| format!("Missing window: {label}"))
}

#[tauri::command]
pub async fn toggle_panel(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    authorize(&window)?;
    let panel = get_window(&app, "panel")?;
    if panel.is_visible().map_err(|e| e.to_string())? {
        return panel.hide().map_err(|e| e.to_string());
    }
    placement::place_panel(&get_window(&app, "avatar")?, &panel)?;
    panel.show().map_err(|e| e.to_string())?;
    panel.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn hide_panel(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    authorize(&window)?;
    get_window(&app, "panel")?.hide().map_err(|e| e.to_string())
}

/** 面板独立移动，不触发头像的吸附或收起逻辑。 */
#[tauri::command]
pub async fn drag_panel(window: WebviewWindow) -> Result<(), String> {
    if window.label() != "panel" {
        return Err("Only panel can use this drag command".into());
    }
    window.start_dragging().map_err(|e| e.to_string())
}

/** 系统拖动可能不向网页派发松手事件，因此从系统按键状态判断结束。 */
#[tauri::command]
pub async fn drag_avatar(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    if window.label() != "avatar" {
        return Err("Only avatar can be dragged".into());
    }
    get_window(&app, "panel")?
        .hide()
        .map_err(|e| e.to_string())?;
    window.start_dragging().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(std::time::Duration::from_millis(100));
        #[cfg(windows)]
        while unsafe { windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(1) } < 0 {
            std::thread::sleep(std::time::Duration::from_millis(16));
        }
        placement::snap_avatar(&window)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn exit_app(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    authorize(&window)?;
    app.exit(0);
    Ok(())
}
