use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppData {
    pub schema_version: u32,
    pub tasks_by_date: HashMap<String, Vec<serde_json::Value>>,
    pub cards: Vec<serde_json::Value>,
    pub slimes: Vec<serde_json::Value>,
    pub settings: serde_json::Value,
    pub updated_at: String,
    pub storage_warning: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyData {
    pub tasks_by_date: HashMap<String, Vec<serde_json::Value>>,
    pub cards: Vec<serde_json::Value>,
    pub demo_cards: Vec<serde_json::Value>,
}
