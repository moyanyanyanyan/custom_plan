use crate::{ai::{prompts, provider::AiProvider, stepfun::{StepFunProvider, stored_key}}, data::AppStore};
use tauri::State;

#[tauri::command]
pub async fn generate_card_copy(
    store: State<'_, AppStore>, source_tasks: Vec<String>,
) -> Result<crate::ai::models::GeneratedCopy, String> {
    let (system, user) = prompts::card_copy(&source_tasks);
    StepFunProvider.generate_copy_with_store(system, user, &store).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_slime_copy(
    store: State<'_, AppStore>, task_context: String,
) -> Result<crate::ai::models::GeneratedCopy, String> {
    let (system, user) = prompts::slime_copy(&task_context);
    StepFunProvider.generate_copy_with_store(system, user, &store).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_card_art(
    store: State<'_, AppStore>, card_id: String, name: String, description: String,
) -> Result<String, String> {
    let bytes = StepFunProvider.generate_image_with_store(prompts::card_art(&name, &description), &store)
        .await.map_err(|e| e.to_string())?;
    store.save_asset(&card_id, &bytes, "png")
}

#[tauri::command]
pub fn save_stepfun_api_key(store: State<'_, AppStore>, key: String) -> Result<(), String> {
    let mut current = store.load().map_err(|e| e.to_string())?;
    current.settings.insert("stepfunApiKey".into(), serde_json::Value::String(key));
    store.save(current, current.revision).map_err(|e| e.to_string())?;
    Ok(())
}
