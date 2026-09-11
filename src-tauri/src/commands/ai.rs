use crate::ai::{prompts, stepfun::generate_copy_with_store};
use tauri::State;

#[tauri::command]
pub async fn generate_slime_copy(
    store: State<'_, crate::data::AppStore>, task_context: String,
) -> Result<crate::ai::models::GeneratedCopy, String> {
    let (system, user) = prompts::slime_copy(&task_context);
    generate_copy_with_store(system, user, &store).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn suggest_task_steps(
    store: State<'_, crate::data::AppStore>, title: String,
) -> Result<Vec<String>, String> {
    let (system, user) = prompts::task_steps(&title);
    crate::ai::stepfun::generate_steps_with_store(system, user, &store)
        .await.map_err(|e| e.to_string())
}

