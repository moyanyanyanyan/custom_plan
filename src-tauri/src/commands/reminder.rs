use crate::data::AppStore;
use chrono::{DateTime, Local};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::process::Command;
use tauri::{AppHandle, State};
use tauri_plugin_notification::NotificationExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn task_name(id: &str) -> String { format!("AbsurdLab-Reminder-{id}") }

fn run_schtasks(args: &[String]) -> Result<(), String> {
    let mut command = Command::new("schtasks");
    command.args(args);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let output = command.output().map_err(|e| e.to_string())?;
    if output.status.success() { Ok(()) } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

pub fn cancel(id: &str) -> Result<(), String> {
    run_schtasks(&["/Delete".into(), "/TN".into(), task_name(id), "/F".into()])
}

pub fn schedule(app: &AppHandle, id: &str, reminder_at: &str) -> Result<(), String> {
    let at = DateTime::parse_from_rfc3339(reminder_at).map_err(|e| e.to_string())?.with_timezone(&Local);
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let _ = cancel(id);
    run_schtasks(&[
        "/Create".into(), "/SC".into(), "ONCE".into(), "/TN".into(), task_name(id),
        "/TR".into(), format!("\"{}\" --fire-reminder {}", exe.display(), id),
        "/SD".into(), at.format("%m/%d/%Y").to_string(), "/ST".into(), at.format("%H:%M").to_string(),
        "/F".into(), "/IT".into(),
    ]).map_err(|e| format!("系统提醒未注册：{e}"))?;
    let _ = app;
    Ok(())
}

#[tauri::command]
pub fn schedule_task_reminder(app: AppHandle, task_id: String, reminder_at: String) -> Result<(), String> {
    schedule(&app, &task_id, &reminder_at)
}

#[tauri::command]
pub fn cancel_task_reminder(task_id: String) -> Result<(), String> { cancel(&task_id) }

#[tauri::command]
pub fn fire_task_reminder(app: AppHandle, store: State<'_, AppStore>, task_id: String) -> Result<(), String> {
    let mut data = store.load()?;
    let now = chrono::Utc::now();
    let mut title = None;
    for tasks in data.tasks_by_date.values() {
        if let Some(task) = tasks.iter().find(|task| task.get("id").and_then(|v| v.as_str()) == Some(task_id.as_str())) {
            let due = task.get("reminderAt").and_then(|v| v.as_str()).and_then(|v| DateTime::parse_from_rfc3339(v).ok())
                .map(|v| v.with_timezone(&chrono::Utc) <= now).unwrap_or(false);
            if !task.get("completed").and_then(|v| v.as_bool()).unwrap_or(false)
                && task.get("remindedAt").map(|v| v.is_null()).unwrap_or(true) && due {
                title = task.get("name").and_then(|v| v.as_str()).map(str::to_owned);
            }
        }
    }
    if let Some(title) = title {
        app.notification().builder().title("离谱发明所 · 任务提醒").body(title)
            .show().map_err(|e| e.to_string())?;
        for tasks in data.tasks_by_date.values_mut() {
            for task in tasks.iter_mut().filter(|task| task.get("id").and_then(|v| v.as_str()) == Some(task_id.as_str())) {
                task["remindedAt"] = serde_json::Value::String(now.to_rfc3339());
            }
        }
        let revision = data.revision;
        store.save(data, revision).map_err(|e| e.to_string())?;
    }
    let _ = cancel(&task_id);
    Ok(())
}

pub fn fire_task_reminder_now(app: &AppHandle, store: &AppStore, task_id: &str) -> Result<(), String> {
    let mut data = store.load()?;
    let now = chrono::Utc::now();
    let mut title = None;
    for tasks in data.tasks_by_date.values() {
        if let Some(task) = tasks.iter().find(|task| task.get("id").and_then(|v| v.as_str()) == Some(task_id)) {
            let due = task.get("reminderAt").and_then(|v| v.as_str()).and_then(|v| DateTime::parse_from_rfc3339(v).ok()).map(|v| v.with_timezone(&chrono::Utc) <= now).unwrap_or(false);
            if !task.get("completed").and_then(|v| v.as_bool()).unwrap_or(false) && task.get("remindedAt").map(|v| v.is_null()).unwrap_or(true) && due { title = task.get("name").and_then(|v| v.as_str()).map(str::to_owned); }
        }
    }
    if let Some(title) = title {
        app.notification().builder().title("离谱发明所 · 任务提醒").body(title).show().map_err(|e| e.to_string())?;
        for tasks in data.tasks_by_date.values_mut() { for task in tasks.iter_mut().filter(|task| task.get("id").and_then(|v| v.as_str()) == Some(task_id)) { task["remindedAt"] = serde_json::Value::String(now.to_rfc3339()); } }
        let revision = data.revision; store.save(data, revision).map_err(|e| e.to_string())?;
    }
    let _ = cancel(task_id); Ok(())
}
