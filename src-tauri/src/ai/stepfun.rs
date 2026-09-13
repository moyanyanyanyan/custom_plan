use super::{models::{ChatResponse, GeneratedCopy, GeneratedItem, ImageResponse, ItemEnchantment, StepSuggestion}, provider::{AiError, AiProvider}};
use crate::data::AppStore;
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

fn env_key() -> Result<String, AiError> {
    std::env::var("STEPFUN_API_KEY").map_err(|_| AiError::MissingKey)
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
    generate_copy_with_key(system, user, env_key()?).await
}

pub async fn generate_image(prompt: String) -> Result<Vec<u8>, AiError> {
    generate_image_with_key(prompt, env_key()?).await
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

pub async fn generate_item_with_store(
    system: String, user: String, store: &AppStore,
) -> Result<GeneratedItem, AiError> {
    let raw = generate_chat_with_key(system, user, stored_key(store)?).await?;
    extract_item(&raw).ok_or(AiError::InvalidResponse)
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
    // step-3.7-flash 带推理：思考内容与正式回答共用 max_tokens 预算。实测 max_tokens=1000 时
    // 思考吃掉全部额度，finish_reason=length 而 content 为空串 → 文案解析失败 → 道具/卡牌全部
    // 退化成占位内容（道具会显示名字首字而不是像素图）。抬高预算并用 json_object 模式压低
    // 思考长度（实测 11.6s/1255 tokens，比纯抬预算更省更快），保证 content 一定是可解析 JSON。
    let response = client()?.post(CHAT_URL).bearer_auth(key).json(&serde_json::json!({
        "model": CHAT_MODEL, "messages": [
            {"role": "system", "content": system}, {"role": "user", "content": user}
        ], "temperature": 1.0, "max_tokens": 4000,
        "response_format": {"type": "json_object"}
    })).send().await.map_err(|e| AiError::Network(e.to_string()))?;
    let body: ChatResponse = checked(response).await?.json().await
        .map_err(|_| AiError::InvalidResponse)?;
    let message = &body.choices.first().ok_or(AiError::InvalidResponse)?.message;
    let content = message.content.trim();
    if !content.is_empty() {
        return Ok(content.into());
    }
    // 兜底：content 仍为空时，从思考内容里抠最后一段花括号 JSON（比直接丢给 extract_* 更稳，
    // 因为思考里可能先出现示例 JSON 片段）。
    message.reasoning_content.as_deref().and_then(last_json_block).ok_or(AiError::InvalidResponse)
}

/// 取文本里最后一段完整的花括号块（按深度扫描，忽略字符串字面量里的括号）。
fn last_json_block(text: &str) -> Option<String> {
    let mut depth = 0usize;
    let mut start = 0usize;
    let mut quoted = false;
    let mut escaped = false;
    let mut found: Option<String> = None;
    for (index, byte) in text.bytes().enumerate() {
        let ch = byte as char;
        if quoted {
            if escaped { escaped = false; }
            else if ch == '\\' { escaped = true; }
            else if ch == '"' { quoted = false; }
            continue;
        }
        match ch {
            '"' => quoted = true,
            '{' => { if depth == 0 { start = index; } depth += 1; }
            '}' => {
                if depth > 0 {
                    depth -= 1;
                    if depth == 0 { found = Some(text[start..=index].to_string()); }
                }
            }
            _ => {}
        }
    }
    found
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

async fn generate_image_with_key(prompt: String, key: String) -> Result<Vec<u8>, AiError> {
    let response = client()?.post(IMAGE_URL).bearer_auth(key).json(&serde_json::json!({
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

/// 道具文案解析：名称/描述为空即视为无效，交给前端走降级道具池。
pub fn extract_item(raw: &str) -> Option<GeneratedItem> {
    let candidate = raw.trim().trim_start_matches("```json").trim_start_matches("```")
        .trim_end_matches("```").trim();
    let start = candidate.find('{')?;
    let end = candidate.rfind('}')? + 1;
    let parsed: GeneratedItem = serde_json::from_str(&candidate[start..end]).ok()?;
    let name = parsed.name.trim().to_string();
    let description = parsed.description.trim().to_string();
    if name.is_empty() || description.is_empty() { return None; }
    Some(GeneratedItem {
        name,
        description,
        enchantment: parsed.enchantment.and_then(|item| {
            let enchanted_name = item.name.trim().to_string();
            (!enchanted_name.is_empty()).then(|| ItemEnchantment {
                name: enchanted_name,
                effect: item.effect.trim().to_string(),
                kind: item.kind.map(|kind| kind.trim().to_lowercase()),
            })
        }),
        art: parsed.art.map(|art| art.trim().to_string()).filter(|art| !art.is_empty()),
    })
}

#[cfg(test)]
mod tests {
    use super::{extract_copy, extract_item, extract_steps, last_json_block};
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
    #[test]
    fn extracts_item_with_enchantment_and_art() {
        let raw = r#"```json
{"name":"会走的汤勺","description":"来自「深夜煮面」的纪念品。","enchantment":{"name":"回锅","effect":"每次盛汤都会自己走回灶台","kind":"UPGRADE"},"art":"a bent steel ladle with a glowing blue handle"}
```"#;
        let item = extract_item(raw).unwrap();
        assert_eq!(item.name, "会走的汤勺");
        assert_eq!(item.enchantment.unwrap().kind.as_deref(), Some("upgrade"));
        assert!(item.art.unwrap().contains("ladle"));
    }
    #[test]
    fn rejects_item_without_name() {
        assert!(extract_item(r#"{"name":"","description":"有描述"}"#).is_none());
        assert!(extract_item("not json").is_none());
    }
    /// 推理模型把预算烧光时 content 为空，只能回退到 reasoning_content 里最后一段 JSON。
    #[test]
    fn picks_last_json_block_from_reasoning() {
        let thinking = "先试写一版:{\"name\":\"草稿\",\"description\":\"忽略\"} 最终答案 {\"name\":\"流光箸\",\"description\":\"描述\"}";
        assert_eq!(last_json_block(thinking).unwrap(), r#"{"name":"流光箸","description":"描述"}"#);
        assert_eq!(last_json_block(r#"{"a":"}"}"#).unwrap(), r#"{"a":"}"}"#);
        assert!(last_json_block("只有思考没有 JSON").is_none());
        assert!(last_json_block("{\"name\":\"未闭合\"").is_none());
    }
}
