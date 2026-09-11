use super::{persistence::write_state, AppData, LegacyData, StoreError};
use base64::Engine;
use std::{fs, path::PathBuf, sync::Mutex};

pub struct AppStore {
    path: PathBuf, assets: PathBuf, state: Mutex<AppData>, migration: Mutex<()>,
}

fn preserve_invalid(root: &std::path::Path, path: &std::path::Path, reason: String) -> Result<AppData, String> {
    let mut index = 1;
    let mut preserved = root.join("state.corrupt.json");
    while preserved.exists() {
        index += 1;
        preserved = root.join(format!("state.corrupt.{index}.json"));
    }
    fs::rename(path, &preserved).map_err(|error| error.to_string())?;
    Ok(AppData {
        storage_warning: Some(format!(
            "数据文件不可用，原文件已保留为 {}：{reason}",
            preserved.display()
        )),
        ..AppData::default()
    })
}

impl AppStore {
    /** 启动时只接受完整且版本兼容的数据，损坏文件会保留供人工恢复。 */
    pub fn open(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        let assets = root.join("assets");
        fs::create_dir_all(&assets).map_err(|error| error.to_string())?;
        let path = root.join("state.json");
        let state = if path.exists() {
            let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
            match serde_json::from_str::<AppData>(&raw) {
                Ok(data) if data.schema_version <= 2 => data,
                Ok(_) => preserve_invalid(&root, &path, "数据版本高于当前程序".into())?,
                Err(error) => preserve_invalid(&root, &path, error.to_string())?,
            }
        } else {
            AppData::default()
        };
        Ok(Self { path, assets, state: Mutex::new(state), migration: Mutex::new(()) })
    }

    pub fn load(&self) -> Result<AppData, String> {
        self.state.lock().map(|data| data.clone()).map_err(|e| e.to_string())
    }

    pub fn save(&self, mut data: AppData, expected: u64) -> Result<AppData, StoreError> {
        let mut current = self.state.lock().map_err(|e| StoreError::from(e.to_string()))?;
        if current.revision != expected {
            return Err(StoreError::StateConflict { latest: Box::new(current.clone()) });
        }
        data.revision = expected + 1;
        write_state(&self.path, &data).map_err(StoreError::from)?;
        *current = data.clone();
        Ok(data)
    }

    pub fn claim_card(&self, date: &str, mut card: serde_json::Value) -> Result<AppData, StoreError> {
        let mut current = self.state.lock().map_err(|e| StoreError::from(e.to_string()))?;
        let exists = current.cards.iter().any(|item| {
            item.get("dailyKey").and_then(|value| value.as_str()) == Some(date)
                || item.get("earnedAt").and_then(|value| value.as_str())
                    .is_some_and(|earned| earned.starts_with(date))
        });
        if exists { return Err(StoreError::DailyCardExists); }
        let object = card.as_object_mut().ok_or_else(|| StoreError::from(String::from("Invalid card")))?;
        object.insert("dailyKey".into(), serde_json::Value::String(date.into()));
        current.cards.push(card);
        current.revision += 1;
        write_state(&self.path, &current).map_err(StoreError::from)?;
        Ok(current.clone())
    }

    pub fn update_card(&self, id: &str, patch: serde_json::Value) -> Result<AppData, StoreError> {
        let mut current = self.state.lock().map_err(|e| StoreError::from(e.to_string()))?;
        let changes = patch.as_object().ok_or_else(|| StoreError::from(String::from("Invalid card patch")))?;
        let card = current.cards.iter_mut().find(|item|
            item.get("id").and_then(|value| value.as_str()) == Some(id))
            .ok_or_else(|| StoreError::from(String::from("Card not found")))?;
        let target = card.as_object_mut().ok_or_else(|| StoreError::from(String::from("Invalid stored card")))?;
        for (key, value) in changes {
            if !matches!(key.as_str(), "id" | "dailyKey" | "earnedAt" | "type") {
                target.insert(key.clone(), value.clone());
            }
        }
        current.revision += 1;
        write_state(&self.path, &current).map_err(StoreError::from)?;
        Ok(current.clone())
    }

    /** 旧数据只在空仓库导入一次，避免重复启动产生重复卡牌。 */
    pub fn import_legacy(&self, legacy: LegacyData, defaults: AppData) -> Result<AppData, String> {
        let _migration = self.migration.lock().map_err(|e| e.to_string())?;
        let current = self.load()?;
        if current.schema_version > 0 { return Ok(current); }
        let mut imported = defaults;
        imported.storage_warning = current.storage_warning;
        if !legacy.tasks_by_date.is_empty() {
            imported.tasks_by_date = legacy.tasks_by_date;
        }
        let mut cards = legacy.cards;
        cards.extend(legacy.demo_cards);
        imported.cards = self.migrate_card_assets(cards);
        let mut state = self.state.lock().map_err(|e| e.to_string())?;
        imported.revision = state.revision + 1;
        write_state(&self.path, &imported)?;
        *state = imported.clone();
        Ok(imported)
    }

    pub fn save_asset(&self, id: &str, bytes: &[u8], extension: &str) -> Result<String, String> {
        if !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err("Invalid asset id".into());
        }
        let path = self.assets.join(format!("{id}.{extension}"));
        fs::write(path, bytes).map_err(|e| e.to_string())?;
        Ok(format!("{id}.{extension}"))
    }

    pub fn load_asset(&self, asset_id: &str) -> Result<Vec<u8>, String> {
        let name = std::path::Path::new(asset_id).file_name().and_then(|v| v.to_str())
            .ok_or("Invalid asset id")?;
        fs::read(self.assets.join(name)).map_err(|e| e.to_string())
    }

    /** 旧图片成功落盘后只清理新 JSON，原 localStorage 继续保留作回退。 */
    fn migrate_card_assets(&self, cards: Vec<serde_json::Value>) -> Vec<serde_json::Value> {
        cards.into_iter().enumerate().map(|(index, mut card)| {
            let Some(object) = card.as_object_mut() else { return card };
            let Some(data_url) = object.get("imagePath").and_then(|value| value.as_str()) else {
                return card;
            };
            let Some((header, encoded)) = data_url.split_once(',') else { return card };
            let extension = if header.contains("image/jpeg") { "jpg" } else { "png" };
            let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(encoded) else {
                return card;
            };
            let id = format!("legacy-card-{index}");
            if let Ok(asset_id) = self.save_asset(&id, &bytes, extension) {
                object.insert("imageAssetId".into(), serde_json::Value::String(asset_id));
                object.remove("imagePath");
            }
            card
        }).collect()
    }
}
