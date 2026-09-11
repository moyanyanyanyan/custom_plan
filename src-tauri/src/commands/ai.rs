use crate::{ai::{prompts, provider::AiProvider, stepfun::StepFunProvider}, data::AppStore};
use tauri::State;

#[tauri::command]
pub async fn generate_card_copy(source_tasks: Vec<String>) -> Result<crate::ai::models::GeneratedCopy, String> {
    let (system, user) = prompts::card_copy(&source_tasks);
    StepFunProvider.generate_copy(system, user).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_slime_copy(task_context: String) -> Result<crate::ai::models::GeneratedCopy, String> {
    let (system, user) = prompts::slime_copy(&task_context);
    StepFunProvider.generate_copy(system, user).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn suggest_task_steps(title: String) -> Result<Vec<String>, String> {
    let (system, user) = prompts::task_steps(&title);
    crate::ai::stepfun::generate_steps(system, user).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_card_art(
    store: State<'_, AppStore>, card_id: String, name: String, description: String,
) -> Result<String, String> {
    let bytes = StepFunProvider.generate_image(prompts::card_art(&name, &description))
        .await.map_err(|e| e.to_string())?;
    store.save_asset(&card_id, &bytes, "png")
}
