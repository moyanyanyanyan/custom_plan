#[derive(Clone, Copy, Debug)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/** 全部使用物理像素，避免混合缩放的显示器之间产生坐标漂移。 */
pub fn snap(work: Rect, avatar: Rect) -> (i32, i32) {
    let right = work.x + (work.width - avatar.width).max(0);
    let x = if avatar.x + avatar.width / 2 < work.x + work.width / 2 {
        work.x
    } else {
        right
    };
    let y = avatar
        .y
        .clamp(work.y, work.y + (work.height - avatar.height).max(0));
    (x, y)
}

/** 为头像预留横向空间，窄屏下缩小面板而不覆盖桌面入口。 */
pub fn panel_rect(work: Rect, avatar: Rect, scale: f64) -> Rect {
    let gap = (12.0 * scale).round() as i32;
    let width = ((480.0 * scale).round() as i32).min((work.width - avatar.width - gap).max(1));
    let height = ((680.0 * scale).round() as i32).min(work.height.max(1));
    let on_left = avatar.x + avatar.width / 2 < work.x + work.width / 2;
    let x = if on_left {
        avatar.x + avatar.width + gap
    } else {
        avatar.x - width - gap
    };
    Rect {
        x: x.clamp(work.x, work.x + (work.width - width).max(0)),
        y: (avatar.y + avatar.height / 2 - height / 2)
            .clamp(work.y, work.y + (work.height - height).max(0)),
        width,
        height,
    }
}
