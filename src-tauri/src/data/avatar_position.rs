use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
pub struct AvatarPosition {
    pub x: i32,
    pub y: i32,
}

pub struct AvatarPositionStore {
    path: PathBuf,
    value: Mutex<Option<AvatarPosition>>,
}

impl AvatarPositionStore {
    /** 位置文件损坏时回退默认位置，不影响任务数据启动。 */
    pub fn open(path: PathBuf) -> Result<Self, String> {
        let value = if path.exists() {
            fs::read_to_string(&path).ok()
                .and_then(|raw| serde_json::from_str(&raw).ok())
        } else {
            None
        };
        Ok(Self { path, value: Mutex::new(value) })
    }

    pub fn load(&self) -> Result<Option<AvatarPosition>, String> {
        self.value.lock().map(|value| *value).map_err(|error| error.to_string())
    }

    pub fn save(&self, position: AvatarPosition) -> Result<(), String> {
        let raw = serde_json::to_vec(&position).map_err(|error| error.to_string())?;
        fs::write(&self.path, raw).map_err(|error| error.to_string())?;
        *self.value.lock().map_err(|error| error.to_string())? = Some(position);
        Ok(())
    }
}
