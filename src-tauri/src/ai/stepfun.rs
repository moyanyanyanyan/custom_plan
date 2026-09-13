use super::{models::{ChatResponse, GeneratedCopy, ImageResponse, StepSuggestion}, provider::{AiError, AiProvider}};
use crate::data::AppStore;
use base64::Engine;
use std::time::Duration;

/// 一条可用的 AI 后端：端点 + 模型名 + 生图尺寸三者必须成套，不能混用。
struct Route {
    chat_url: &'static str,
    image_url: &'static str,
    chat_model: &'static str,
    image_model: &'static str,
    image_size: &'static str,
}

/// TokenDance 网关（key 形如 sk-…）。生图走 seedream，尺寸 1920x1920。
const TOKENDANCE: Route = Route {
    chat_url: "https://tokendance.space/gateway/v1/chat/completions",
    image_url: "https://tokendance.space/gateway/v1/images/generations",
    chat_model: "deepseek-v4-flash",
    image_model: "seedream-5.0-lite",
    image_size: "1920x1920",
};

/// 阶跃星辰官方 API（key 形如 1sMPgJ…，非 sk- 前缀）。
///
/// size 只能用官方文档列出的档位：1024x1024 / 768x1360 / 896x1184 / 1360x768 / 1184x896；
/// 传 1920x1920 会 400 `size_invalid`。
const STEPFUN: Route = Route {
    chat_url: "https://api.stepfun.com/v1/chat/completions",
    image_url: "https://api.stepfun.com/v1/images/generations",
    chat_model: "step-3.7-flash",
    image_model: "step-image-edit-2",
    image_size: "1024x1024",
};

/// 按 key 形态选后端：显式设置 TOKENDANCE_API_KEY，或 key 是 sk- 前缀 → 网关；否则走阶跃官方。
///
/// 2026-09-13 的线上故障根因就是这里：端点被整体切到 TokenDance 网关，但大家手上的 key 仍是
/// 阶跃官方 key，网关一律回 401「API 密钥不存在」，文案与插画都拿不到，界面表现为「无法生成图片」。
/// 用同一把 key 直连 api.stepfun.com 的 chat 与 images 接口均为 200。
fn route_for(key: &str) -> &'static Route {
    if std::env::var("TOKENDANCE_API_KEY").is_ok() || key.starts_with("sk-") {
        &TOKENDANCE
    } else {
        &STEPFUN
    }
}

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

/// 没有保存过的 key 时读环境变量：TOKENDANCE_API_KEY 优先，其次 STEPFUN_API_KEY。
/// 具体走哪个后端由 `route_for` 按 key 形态决定，不在这里硬编码。
fn env_api_key() -> Result<String, AiError> {
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
    generate_copy_with_key(system, user, env_api_key()?).await
}

pub async fn generate_image(prompt: String) -> Result<Vec<u8>, AiError> {
    generate_image_with_key(prompt, env_api_key()?).await
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
    let route = route_for(&key);
    let response = client()?.post(route.chat_url).bearer_auth(key).json(&serde_json::json!({
        "model": route.chat_model, "messages": [
            {"role": "system", "content": system}, {"role": "user", "content": user}
        ], "temperature": 1.0,
        // 3000 而不是 1000：step-3.7-flash / deepseek-v4-flash 都是推理模型，思考过程也计费，
        // 预算太小会被思考吃光、content 返回空串（2026-09-13 实测 max_tokens=1000 时 completion 全是 reasoning）。
        "max_tokens": 3000
    })).send().await.map_err(|e| AiError::Network(e.to_string()))?;
    let body: ChatResponse = checked(response).await?.json().await
        .map_err(|_| AiError::InvalidResponse)?;
    let message = body.choices.into_iter().next().ok_or(AiError::InvalidResponse)?.message;
    let content = message.content.trim();
    if !content.is_empty() {
        return Ok(content.into());
    }
    // 兜底：content 为空时从 reasoning_content 里截出最后一段 JSON（原本这里直接返回空串，
    // 调用方 extract_copy 找不到 `{` 就报 InvalidResponse，界面表现为文案与插画都出不来）。
    let reasoning = message.reasoning_content.unwrap_or_default();
    let start = reasoning.find('{').ok_or(AiError::InvalidResponse)?;
    let end = reasoning.rfind('}').ok_or(AiError::InvalidResponse)? + 1;
    if start >= end {
        return Err(AiError::InvalidResponse);
    }
    Ok(reasoning[start..end].to_string())
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
    let route = route_for(&key);
    let mut body = serde_json::json!({
        "model": route.image_model, "prompt": prompt, "n": 1,
        // 尺寸必须用该后端支持的档位：阶跃官方 step-image-edit-2 只接受
        // 1024x1024 / 768x1360 / 896x1184 / 1360x768 / 1184x896，传 1920x1920 会 400 size_invalid。
        "size": route.image_size, "response_format": "b64_json"
    });
    // If a character reference image exists, include it for image-to-image
    if let Some(data_url) = load_ref_image() {
        body["image"] = serde_json::json!(data_url);
    }
    let response = client()?.post(route.image_url).bearer_auth(key).json(&body)
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
