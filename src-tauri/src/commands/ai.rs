use crate::ai::{prompts, stepfun::{generate_copy_with_store, generate_image_with_store}};
use base64::Engine;
use tauri::State;

#[tauri::command]
pub async fn generate_card_copy(
    store: State<'_, crate::data::AppStore>, tasks: Vec<String>,
) -> Result<crate::ai::models::GeneratedCopy, String> {
    let (system, user) = prompts::card_copy(&tasks);
    generate_copy_with_store(system, user, &store).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_card_art(
    store: State<'_, crate::data::AppStore>,
    name: String,
    description: String,
    scene: Option<String>,
) -> Result<String, String> {
    let prompt = prompts::card_art(&name, &description, scene.as_deref());
    let image = generate_image_with_store(prompt, &store)
        .await
        .map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(image))
}

#[tauri::command]
pub fn save_stepfun_api_key(
    store: State<'_, crate::data::AppStore>, key: String,
) -> Result<(), String> {
    let mut data = store.load()?;
    if !data.settings.is_object() {
        data.settings = serde_json::Value::Object(Default::default());
    }
    data.settings
        .as_object_mut()
        .expect("settings was normalized to an object")
        .insert("stepfunApiKey".into(), serde_json::Value::String(key));
    let revision = data.revision;
    store.save(data, revision).map(|_| ()).map_err(|e| e.to_string())
}

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

