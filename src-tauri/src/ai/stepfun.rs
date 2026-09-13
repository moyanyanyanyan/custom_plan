use super::{models::{ChatResponse, GeneratedCopy, ImageResponse, StepSuggestion}, provider::{AiError, AiProvider}};
use crate::data::AppStore;
use base64::Engine;
use std::time::Duration;

const CHAT_MODEL: &str = "deepseek-v4-flash";
const IMAGE_MODEL: &str = "seedream-5.0-lite";
const CHAT_URL: &str = "https://tokendance.space/gateway/v1/chat/completions";
const IMAGE_URL: &str = "https://tokendance.space/gateway/v1/images/generations";

/// 仓库当前未包含三视图资源，因此复用已纳入版本控制的引导头像，保证干净检出也能编译。
const DEFAULT_REF: &[u8] = include_bytes!("../../../public/onboarding/avatar.jpg");

pub struct StepFunProvider;

impl AiProvider for StepFunProvider {
    async fn generate_copy(&self, system: String, user: String) -> Result<GeneratedCopy, AiError> {
        generate_copy(system, user).await
    }
    async fn generate_image(&self, prompt: String) -> Result<Vec<u8>, AiError> {
        generate_image(prompt).await
    }
}

fn env_key() -> Result<String, AiError> {
    std::env::var("STEPFUN_API_KEY").map_err(|_| AiError::MissingKey)
}

fn tokendance_key() -> Result<String, AiError> {
    std::env::var("TOKENDANCE_API_KEY")
        .or_else(|_| std::env::var("STEPFUN_API_KEY"))
        .map_err(|_| AiError::MissingKey)
}

pub fn stored_key(store: &AppStore) -> Result<String, AiError> {
    let data = store.load().map_err(|e| AiError::Network(e.to_string()))?;
    if let Some(value) = data.settings.get("stepfunApiKey").and_then(|v| v.as_str()) {
        if !value.is_empty() {
            return Ok(value.into());
        }
    }
    env_key()
}

fn client() -> Result<reqwest::Client, AiError> {
    reqwest::Client::builder().timeout(Duration::from_secs(75)).build()
        .map_err(|e| AiError::Network(e.to_string()))
}

async fn checked(response: reqwest::Response) -> Result<reqwest::Response, AiError> {
    let status = response.status();
    if status.as_u16() == 429 { return Err(AiError::RateLimited); }
    if !status.is_success() { return Err(AiError::Service(status.as_u16())); }
    Ok(response)
}

pub async fn generate_copy(system: String, user: String) -> Result<GeneratedCopy, AiError> {
    generate_copy_with_key(system, user, tokendance_key()?).await
}

pub async fn generate_image(prompt: String) -> Result<Vec<u8>, AiError> {
    generate_image_with_key(prompt, tokendance_key()?).await
}

pub async fn generate_copy_with_store(
    system: String, user: String, store: &AppStore,
) -> Result<GeneratedCopy, AiError> {
    generate_copy_with_key(system, user, stored_key(store)?).await
}

pub async fn generate_image_with_store(
    prompt: String, store: &AppStore,
) -> Result<Vec<u8>, AiError> {
    generate_image_with_key(prompt, stored_key(store)?).await
}

pub async fn generate_steps_with_store(
    system: String, user: String, store: &AppStore,
) -> Result<Vec<String>, AiError> {
    let raw = generate_chat_with_key(system, user, stored_key(store)?).await?;
    extract_steps(&raw).ok_or(AiError::InvalidResponse)
}

async fn generate_copy_with_key(system: String, user: String, key: String) -> Result<GeneratedCopy, AiError> {
    let raw = generate_chat_with_key(system, user, key).await?;
    extract_copy(&raw).ok_or(AiError::InvalidResponse)
}

async fn generate_chat_with_key(system: String, user: String, key: String) -> Result<String, AiError> {
    let response = client()?.post(CHAT_URL).bearer_auth(key).json(&serde_json::json!({
        "model": CHAT_MODEL, "messages": [
            {"role": "system", "content": system}, {"role": "user", "content": user}
        ], "temperature": 1.0, "max_tokens": 1000
    })).send().await.map_err(|e| AiError::Network(e.to_string()))?;
    let body: ChatResponse = checked(response).await?.json().await
        .map_err(|_| AiError::InvalidResponse)?;
    Ok(body.choices.first().ok_or(AiError::InvalidResponse)?.message.content.trim().into())
}

pub fn extract_steps(raw: &str) -> Option<Vec<String>> {
    let candidate = raw.trim().trim_start_matches("```json").trim_start_matches("```")
        .trim_end_matches("```").trim();
    let start = candidate.find('{')?;
    let end = candidate.rfind('}')? + 1;
    let parsed: StepSuggestion = serde_json::from_str(&candidate[start..end]).ok()?;
    let steps: Vec<String> = parsed.steps.into_iter().map(|step| step.trim().chars().take(20).collect())
        .filter(|step: &String| !step.is_empty()).take(6).collect();
    (steps.len() >= 2).then_some(steps)
}

/// 按真实文件头判断 MIME。历史上这里硬编码成 png，而实际参考图是 JPEG，
/// 声明与实际格式不符（模型端可能拒收或误解），故改为嗅探。
fn sniff_mime(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) { "image/jpeg" }
    else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) { "image/png" }
    else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" { "image/webp" }
    else { "image/jpeg" }
}

/// 参考图来源优先级：
/// 1. 环境变量 CHARACTER_REF_PATH 指向的自定义文件（显式覆盖，供调试用）
/// 2. 内置三视图（编译期内嵌，永远存在）：CHARACTER_REF_VARIANT=front|side|back，默认 front
///
/// 注意：**不再**静默读取 %APPDATA%\com.absurdlab.desktop\character_ref.png——
/// 那张历史文件是一张背影图，正是「角色形象出不来」的元凶。
fn load_ref_image() -> Option<String> {
    if let Ok(custom) = std::env::var("CHARACTER_REF_PATH") {
        let path = std::path::Path::new(&custom);
        if let Ok(bytes) = std::fs::read(path) {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            return Some(format!("data:{};base64,{}", sniff_mime(&bytes), b64));
        }
    }
    let b64 = base64::engine::general_purpose::STANDARD.encode(DEFAULT_REF);
    Some(format!("data:{};base64,{}", sniff_mime(DEFAULT_REF), b64))
}

async fn generate_image_with_key(prompt: String, key: String) -> Result<Vec<u8>, AiError> {
    let mut body = serde_json::json!({
        "model": IMAGE_MODEL, "prompt": prompt, "n": 1,
        "size": "1920x1920", "response_format": "b64_json"
    });
    // If a character reference image exists, include it for image-to-image
    if let Some(data_url) = load_ref_image() {
        body["image"] = serde_json::json!(data_url);
    }
    let response = client()?.post(IMAGE_URL).bearer_auth(key).json(&body)
        .send().await.map_err(|e| AiError::Network(e.to_string()))?;
    let body: ImageResponse = checked(response).await?.json().await
        .map_err(|_| AiError::InvalidResponse)?;
    let encoded = body.data.first().and_then(|item| item.b64_json.as_ref())
        .ok_or(AiError::InvalidResponse)?;
    base64::engine::general_purpose::STANDARD.decode(encoded)
        .map_err(|_| AiError::InvalidResponse)
}

pub fn extract_copy(raw: &str) -> Option<GeneratedCopy> {
    let candidate = raw.trim().trim_start_matches("```json").trim_start_matches("```")
        .trim_end_matches("```").trim();
    let start = candidate.find('{')?;
    let end = candidate.rfind('}')? + 1;
    serde_json::from_str(&candidate[start..end]).ok()
}

#[cfg(test)]
mod tests {
    use super::{extract_copy, extract_steps};
    #[test]
    fn extracts_json_with_or_without_fence() {
        assert_eq!(extract_copy(r#"{"name":"A","description":"B"}"#).unwrap().name, "A");
        assert_eq!(extract_copy("```json\n{\"name\":\"A\",\"description\":\"B\"}\nn```").unwrap().description, "B");
    }
    #[test]
    fn rejects_invalid_copy() { assert!(extract_copy("not json").is_none()); }
    #[test]
    fn validates_step_count() {
        assert_eq!(extract_steps(r#"{"steps":["订酒店","买机票"]}"#).unwrap().len(), 2);
        assert!(extract_steps(r#"{"steps":["只有一步"]}"#).is_none());
    }
}
