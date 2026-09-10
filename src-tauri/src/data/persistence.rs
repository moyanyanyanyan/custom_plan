use super::AppData;
use std::{fs, path::Path};

/** 先写临时文件再替换正式文件，失败时尽量恢复上一版本。 */
pub fn write_state(path: &Path, data: &AppData) -> Result<(), String> {
    let raw = serde_json::to_vec_pretty(data).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    let backup = path.with_extension("json.backup");
    fs::write(&temporary, raw).map_err(|error| error.to_string())?;
    if path.exists() {
        if backup.exists() { fs::remove_file(&backup).map_err(|error| error.to_string())?; }
        fs::rename(path, &backup).map_err(|error| error.to_string())?;
    }
    if let Err(error) = fs::rename(&temporary, path) {
        if backup.exists() { let _ = fs::rename(&backup, path); }
        return Err(error.to_string());
    }
    if backup.exists() { fs::remove_file(&backup).map_err(|error| error.to_string())?; }
    Ok(())
}
