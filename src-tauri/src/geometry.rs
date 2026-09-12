#[derive(Clone, Copy, Debug)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

fn settle_axis(position: i32, minimum: i32, maximum: i32, threshold: i32) -> i32 {
    let clamped = position.clamp(minimum, maximum);
    if clamped - minimum <= threshold { minimum }
    else if maximum - clamped <= threshold { maximum }
    else { clamped }
}

/** 全部使用物理像素，只在距离边缘足够近时吸附。 */
pub fn settle(work: Rect, avatar: Rect, threshold: i32) -> (i32, i32) {
    let right = work.x + (work.width - avatar.width).max(0);
    let bottom = work.y + (work.height - avatar.height).max(0);
    (
        settle_axis(avatar.x, work.x, right, threshold.max(0)),
        settle_axis(avatar.y, work.y, bottom, threshold.max(0)),
    )
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
