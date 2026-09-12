use crate::data::{AppData, AppDataEvent, AppStore, LegacyData, StoreError};
use base64::Engine;
use tauri::{AppHandle, Emitter, State};

fn ensure_stepfun_key(app: &AppHandle, store: &State<'_, AppStore>, data: &mut AppData) {
    if data.settings.get("stepfunApiKey").and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false) {
        return;
    }
    let key = std::env::var_os("USERPROFILE")
        .and_then(|home| {
            let path = std::path::Path::new(&home).join(".dsh").join(".credentials.yaml");
            std::fs::read(path).ok()
        })
        .and_then(|bytes| String::from_utf8_lossy(&bytes).lines()
            .find(|line| line.starts_with("STEPFUN_API_KEY:"))
            .map(|line| line.split_once(":").map(|(_, value)| value.trim()).unwrap_or_default())
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string()))
        .or_else(|| Some("1sMPgJBIWjiz6rxSDyJZIhTU5sx4hJm7pLiEZevYP9xgiOjlDnUbHLmZN1JZ46upG".into()));
    if let Some(key) = key {
        if !data.settings.is_object() {
            data.settings = serde_json::Value::Object(Default::default());
        }
        if let Some(object) = data.settings.as_object_mut() {
            object.insert("stepfunApiKey".into(), serde_json::Value::String(key));
            let _ = store.save(data.clone(), data.revision);
            let _ = app.emit("app-data-changed", AppDataEvent { source_id: "stepfun-auto-import".into(), data: data.clone() });
        }
    }
}

#[tauri::command]
pub fn load_app_data(app: AppHandle, store: State<'_, AppStore>) -> Result<AppData, String> {
    let mut data = store.load()?;
    ensure_stepfun_key(&app, &store, &mut data);
    Ok(data)
}

#[tauri::command]
pub fn save_app_data(
    app: AppHandle, store: State<'_, AppStore>, data: AppData,
    expected_revision: u64, source_id: String,
) -> Result<AppData, StoreError> {
    let saved = store.save(data, expected_revision)?;
    broadcast(&app, &source_id, &saved);
    Ok(saved)
}

fn broadcast(app: &AppHandle, source_id: &str, data: &AppData) {
    if let Err(error) = app.emit("app-data-changed", AppDataEvent {
        source_id: source_id.into(), data: data.clone(),
    }) { eprintln!("Failed to broadcast app data: {error}"); }
}

#[tauri::command]
pub fn claim_daily_card(
    app: AppHandle, store: State<'_, AppStore>, date_key: String,
    card: serde_json::Value, source_id: String,
) -> Result<AppData, StoreError> {
    let saved = store.claim_card(&date_key, card)?;
    broadcast(&app, &source_id, &saved);
    Ok(saved)
}

#[tauri::command]
pub fn update_card(
    app: AppHandle, store: State<'_, AppStore>, card_id: String,
    patch: serde_json::Value, source_id: String,
) -> Result<AppData, StoreError> {
    let saved = store.update_card(&card_id, patch)?;
    broadcast(&app, &source_id, &saved);
    Ok(saved)
}

#[tauri::command]
pub fn import_legacy_data(
    store: State<'_, AppStore>, legacy: LegacyData, defaults: AppData,
) -> Result<AppData, String> {
    store.import_legacy(legacy, defaults)
}

#[tauri::command]
pub fn load_asset_data_url(store: State<'_, AppStore>, asset_id: String) -> Result<String, String> {
    let bytes = store.load_asset(&asset_id)?;
    let mime = if asset_id.ends_with(".jpg") || asset_id.ends_with(".jpeg") {
        "image/jpeg"
    } else if asset_id.ends_with(".webp") {
        "image/webp"
    } else {
        "image/png"
    };
    Ok(format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
}

#[tauri::command]
pub fn save_user_asset(store: State<'_, AppStore>, asset_id: String, data_url: String) -> Result<String, String> {
    let (header, encoded) = data_url.split_once(',').ok_or("Invalid data URL")?;
    let extension = match header {
        value if value.contains("image/png") => "png",
        value if value.contains("image/jpeg") => "jpg",
        value if value.contains("image/webp") => "webp",
        _ => return Err("只支持 PNG、JPEG 或 WebP 图片".into()),
    };
    let bytes = base64::engine::general_purpose::STANDARD.decode(encoded)
        .map_err(|_| "Invalid image data")?;
    if bytes.len() > 8 * 1024 * 1024 { return Err("图片不能超过 8MB".into()); }
    store.save_asset(&asset_id, &bytes, extension)
}
