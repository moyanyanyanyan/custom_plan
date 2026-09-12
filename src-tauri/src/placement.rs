use crate::geometry::{self, Rect};
use crate::data::AvatarPosition;
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

/** 保存的位置可能来自旧分辨率或多屏配置，超出当前屏幕时回退默认。 */
fn is_within_work_area(pos: &AvatarPosition, side: i32, origin_x: i32, origin_y: i32, width: i32, height: i32) -> bool {
    pos.x >= origin_x
        && pos.y >= origin_y
        && pos.x + side <= origin_x + width
        && pos.y + side <= origin_y + height
}

/** 首次启动固定在主屏，后续拖动才跟随所在屏幕。 */
pub fn initialize(avatar: &WebviewWindow, saved: Option<AvatarPosition>) -> Result<AvatarPosition, String> {
    let monitor = avatar
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No primary display available")?;
    let area = monitor.work_area();
    let side = (48.0 * monitor.scale_factor()).round() as u32;
    avatar
        .set_size(PhysicalSize::new(side, side))
        .map_err(|e| e.to_string())?;
    let default_pos = AvatarPosition {
        x: area.position.x + area.size.width as i32 - side as i32,
        y: area.position.y + (area.size.height as i32 - side as i32) / 2,
    };
    let initial = saved
        .filter(|pos| is_within_work_area(
            pos,
            side as i32,
            area.position.x,
            area.position.y,
            area.size.width as i32,
            area.size.height as i32,
        ))
        .unwrap_or(default_pos);
    avatar.set_position(PhysicalPosition::new(initial.x, initial.y))
        .map_err(|e| e.to_string())?;
    let (_, scale) = work_area(avatar)?;
    let scaled_side = (48.0 * scale).round() as u32;
    avatar.set_size(PhysicalSize::new(scaled_side, scaled_side))
        .map_err(|e| e.to_string())?;
    settle_avatar(avatar, 0.0)
}

/** 松手时保证头像可见，距离四边较近时才吸附。 */
pub fn settle_avatar(avatar: &WebviewWindow, threshold: f64) -> Result<AvatarPosition, String> {
    let (work, scale) = work_area(avatar)?;
    let distance = (threshold * scale).round() as i32;
    let (x, y) = geometry::settle(work, avatar_rect(avatar)?, distance);
    avatar.set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    Ok(AvatarPosition { x, y })
}

/** 每次展开重新计算，但不改变用户选择的自由位置。 */
pub fn place_panel(avatar: &WebviewWindow, panel: &WebviewWindow) -> Result<AvatarPosition, String> {
    let position = settle_avatar(avatar, 0.0)?;
    let (work, scale) = work_area(avatar)?;
    let rect = geometry::panel_rect(work, avatar_rect(avatar)?, scale);
    panel
        .set_position(PhysicalPosition::new(rect.x, rect.y))
        .map_err(|e| e.to_string())?;
    // 尺寸由面板模式命令负责；这里仅定位，避免重新打开时覆盖紧凑模式。
    Ok(position)
}
