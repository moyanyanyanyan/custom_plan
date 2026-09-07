use crate::geometry::{self, Rect};
use tauri::{PhysicalPosition, PhysicalSize, WebviewWindow};

/** 使用系统工作区，自动排除任务栏和其他已停靠的桌面工具。 */
fn work_area(window: &WebviewWindow) -> Result<(Rect, f64), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .or(window.primary_monitor().map_err(|e| e.to_string())?)
        .ok_or("No display available")?;
    let area = monitor.work_area();
    Ok((
        Rect {
            x: area.position.x,
            y: area.position.y,
            width: area.size.width as i32,
            height: area.size.height as i32,
        },
        monitor.scale_factor(),
    ))
}

/** 读取实际窗口尺寸，以系统缩放后的尺寸计算边界。 */
fn avatar_rect(window: &WebviewWindow) -> Result<Rect, String> {
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    Ok(Rect {
        x: position.x,
        y: position.y,
        width: size.width as i32,
        height: size.height as i32,
    })
}

/** 首次启动固定在主屏，后续拖动才跟随所在屏幕。 */
pub fn initialize(avatar: &WebviewWindow) -> Result<(), String> {
    let monitor = avatar
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No primary display available")?;
    let area = monitor.work_area();
    let side = (64.0 * monitor.scale_factor()).round() as u32;
    avatar
        .set_size(PhysicalSize::new(side, side))
        .map_err(|e| e.to_string())?;
    avatar
        .set_position(PhysicalPosition::new(
            area.position.x + area.size.width as i32 - side as i32,
            area.position.y + (area.size.height as i32 - side as i32) / 2,
        ))
        .map_err(|e| e.to_string())
}

/** 在松手后单次吸附，避免拖动过程中窗口反复跳回边缘。 */
pub fn snap_avatar(avatar: &WebviewWindow) -> Result<(), String> {
    let (work, _) = work_area(avatar)?;
    let (x, y) = geometry::snap(work, avatar_rect(avatar)?);
    avatar
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

/** 每次展开重新计算，使显示器和缩放设置变化后仍然可见。 */
pub fn place_panel(avatar: &WebviewWindow, panel: &WebviewWindow) -> Result<(), String> {
    snap_avatar(avatar)?;
    let (work, scale) = work_area(avatar)?;
    let rect = geometry::panel_rect(work, avatar_rect(avatar)?, scale);
    panel
        .set_position(PhysicalPosition::new(rect.x, rect.y))
        .map_err(|e| e.to_string())?;
    panel
        .set_size(PhysicalSize::new(rect.width as u32, rect.height as u32))
        .map_err(|e| e.to_string())
}
