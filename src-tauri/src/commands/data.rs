use crate::data::{AppData, AppStore, LegacyData};
use base64::Engine;
use tauri::State;

#[tauri::command]
pub fn load_app_data(store: State<'_, AppStore>) -> Result<AppData, String> {
    store.load()
}

#[tauri::command]
pub fn save_app_data(store: State<'_, AppStore>, data: AppData) -> Result<(), String> {
    store.save(data)
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
    let mime = if asset_id.ends_with(".jpg") { "image/jpeg" } else { "image/png" };
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
