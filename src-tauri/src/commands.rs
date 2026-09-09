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

/* ---------- AI 相关 command（密钥只存在于 Rust 侧环境变量，不进前端包） ---------- */

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AiCopyResponse {
    pub name: String,
    pub description: String,
}

fn stepfun_key() -> Result<String, String> {
    std::env::var("STEPFUN_API_KEY").map_err(|e| format!("STEPFUN_API_KEY missing: {e}"))
}

fn extract_ai_copy(raw: &str) -> Option<AiCopyResponse> {
    let candidate = raw
        .strip_prefix("```json")
        .and_then(|s| s.strip_suffix("```"))
        .or_else(|| raw.strip_prefix("```").and_then(|s| s.strip_suffix("```")))
        .unwrap_or(raw);
    let start = candidate.find(|c: char| c == '{' || c == '[')?;
    for end in (start + 1..=candidate.len()).rev() {
        if let Ok(parsed) = serde_json::from_str::<AiCopyResponse>(&candidate[start..end]) {
            return Some(parsed);
        }
    }
    None
}

#[tauri::command]
pub async fn generate_ai_copy(source_tasks: Vec<String>) -> Result<Option<AiCopyResponse>, String> {
    let key = stepfun_key()?;
    let list = if source_tasks.is_empty() {
        "（无）"
    } else {
        &source_tasks.join("、")
    };
    let body = serde_json::json!({
        "model": "step-3.7-flash",
        "messages": [
            {
                "role": "system",
                "content":
                    "你是「离谱发明所」APP 的卡牌文案生成器。用户给出\"今日完成的任务列表\"。" +
                    "请基于这些真实任务，构思一个荒诞但可自圆其说的发明卡牌：" +
                    "卡牌名称 4-10 个汉字；卡牌描述 40-80 字、幽默冷静的说明书口吻、" +
                    "只允许围绕给定的任务展开，禁止编造任何任务之外的事实或细节。" +
                    "只输出一个 JSON 对象，不要输出任何解释或多余文字：" +
                    "{\"name\":\"卡牌名称\",\"description\":\"卡牌描述\"}",
            },
            { "role": "user", "content": format!("今日完成任务：{list}") },
        ],
        "temperature": 1.0,
        "max_tokens": 1000,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.stepfun.com/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {key}"))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Ok(None);
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let raw = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim();
    Ok(extract_ai_copy(raw))
}

#[tauri::command]
pub async fn generate_artwork(prompt: String) -> Result<Option<String>, String> {
    let key = stepfun_key()?;
    let body = serde_json::json!({
        "model": "step-image-edit-2",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json",
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.stepfun.com/v1/images/generations")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {key}"))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Ok(None);
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let b64 = json["data"][0]["b64_json"].as_str();
    Ok(b64.map(|s| s.to_string()))
}
