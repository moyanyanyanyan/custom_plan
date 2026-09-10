use super::{models::{ChatResponse, GeneratedCopy, ImageResponse}, provider::{AiError, AiProvider}};
use base64::Engine;
use std::time::Duration;

const CHAT_MODEL: &str = "step-3.7-flash";
const IMAGE_MODEL: &str = "step-image-edit-2";
const CHAT_URL: &str = "https://api.stepfun.com/v1/chat/completions";
const IMAGE_URL: &str = "https://api.stepfun.com/v1/images/generations";

pub struct StepFunProvider;

impl AiProvider for StepFunProvider {
    async fn generate_copy(&self, system: String, user: String) -> Result<GeneratedCopy, AiError> {
        generate_copy(system, user).await
    }
    async fn generate_image(&self, prompt: String) -> Result<Vec<u8>, AiError> {
        generate_image(prompt).await
    }
}

fn key() -> Result<String, AiError> {
    std::env::var("STEPFUN_API_KEY").map_err(|_| AiError::MissingKey)
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
    let response = client()?.post(CHAT_URL).bearer_auth(key()?).json(&serde_json::json!({
        "model": CHAT_MODEL, "messages": [
            {"role": "system", "content": system}, {"role": "user", "content": user}
        ], "temperature": 1.0, "max_tokens": 1000
    })).send().await.map_err(|e| AiError::Network(e.to_string()))?;
    let body: ChatResponse = checked(response).await?.json().await
        .map_err(|_| AiError::InvalidResponse)?;
    let raw = body.choices.first().ok_or(AiError::InvalidResponse)?.message.content.trim();
    extract_copy(raw).ok_or(AiError::InvalidResponse)
}

pub async fn generate_image(prompt: String) -> Result<Vec<u8>, AiError> {
    let response = client()?.post(IMAGE_URL).bearer_auth(key()?).json(&serde_json::json!({
        "model": IMAGE_MODEL, "prompt": prompt, "n": 1,
        "size": "1024x1024", "response_format": "b64_json"
    })).send().await.map_err(|e| AiError::Network(e.to_string()))?;
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
    use super::extract_copy;
    #[test]
    fn extracts_json_with_or_without_fence() {
        assert_eq!(extract_copy(r#"{"name":"A","description":"B"}"#).unwrap().name, "A");
        assert_eq!(extract_copy("```json\n{\"name\":\"A\",\"description\":\"B\"}\nn```").unwrap().description, "B");
    }
    #[test]
    fn rejects_invalid_copy() { assert!(extract_copy("not json").is_none()); }
}
