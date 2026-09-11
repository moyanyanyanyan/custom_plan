use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::{Display, Formatter};

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppData {
    pub schema_version: u32,
    pub revision: u64,
    pub tasks_by_date: HashMap<String, Vec<serde_json::Value>>,
    pub cards: Vec<serde_json::Value>,
    pub slimes: Vec<serde_json::Value>,
    pub settings: serde_json::Value,
    pub updated_at: String,
    pub storage_warning: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "code", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StoreError {
    StateConflict { latest: Box<AppData> },
    DailyCardExists,
    Failure { message: String },
}

impl From<String> for StoreError {
    fn from(message: String) -> Self { Self::Failure { message } }
}

impl Display for StoreError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::StateConflict { latest: _ } => write!(f, "STORE_STATE_CONFLICT"),
            Self::DailyCardExists => write!(f, "STORE_DAILY_CARD_EXISTS"),
            Self::Failure { message } => write!(f, "STORE_FAILURE: {message}"),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDataEvent {
    pub source_id: String,
    pub data: AppData,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyData {
    pub tasks_by_date: HashMap<String, Vec<serde_json::Value>>,
    pub cards: Vec<serde_json::Value>,
    pub demo_cards: Vec<serde_json::Value>,
}
