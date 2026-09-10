use crate::geometry::{panel_rect, snap, Rect};

const WORK: Rect = Rect {
    x: 0,
    y: 0,
    width: 1920,
    height: 1040,
};

#[test]
fn snaps_to_nearest_edge_and_clamps_vertical_position() {
    assert_eq!(
        snap(
            WORK,
            Rect {
                x: 100,
                y: -50,
                width: 64,
                height: 64
            }
        ),
        (0, 0)
    );
    assert_eq!(
        snap(
            WORK,
            Rect {
                x: 1500,
                y: 1100,
                width: 64,
                height: 64
            }
        ),
        (1856, 976)
    );
}

#[test]
fn supports_negative_monitor_coordinates_and_taskbar_offsets() {
    let work = Rect {
        x: -1920,
        y: 40,
        width: 1920,
        height: 1040,
    };
    assert_eq!(
        snap(
            work,
            Rect {
                x: -1800,
                y: 0,
                width: 96,
                height: 96
            }
        ),
        (-1920, 40)
    );
    assert_eq!(
        snap(
            work,
            Rect {
                x: -100,
                y: 1100,
                width: 96,
                height: 96
            }
        ),
        (-96, 984)
    );
}

#[test]
fn panel_opens_inward_on_both_edges() {
    let left = panel_rect(
        WORK,
        Rect {
            x: 0,
            y: 400,
            width: 48,
            height: 48,
        },
        1.0,
    );
    let right = panel_rect(
        WORK,
        Rect {
            x: 1872,
            y: 400,
            width: 48,
            height: 48,
        },
        1.0,
    );
    assert_eq!((left.x, left.width, left.height), (60, 480, 680));
    assert_eq!((right.x, right.width, right.height), (1380, 480, 680));
}

#[test]
fn scaled_panel_fits_small_work_area_without_covering_avatar() {
    let work = Rect {
        x: -1280,
        y: 48,
        width: 1280,
        height: 672,
    };
    let panel = panel_rect(
        work,
        Rect {
            x: -96,
            y: 600,
            width: 96,
            height: 96,
        },
        1.5,
    );
    assert_eq!(panel.height, 672);
    assert!(panel.x >= work.x && panel.y >= work.y);
    assert!(panel.x + panel.width <= -114);
    assert!(panel.y + panel.height <= 720);
}
