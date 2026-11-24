use super::{models::ChatResponse, provider::AiError};
use serde::Deserialize;
use std::time::Duration;

const BASE: &str = "https://api.siliconflow.cn/v1";
const CHAT_MODEL: &str = "Qwen/Qwen2.5-72B-Instruct";
const IMAGE_MODEL: &str = "Qwen/Qwen-Image";

fn client() -> Result<reqwest::Client, AiError> {
    reqwest::Client::builder().timeout(Duration::from_secs(120)).build()
        .map_err(|error| AiError::Network(error.to_string()))
}

async fn checked(response: reqwest::Response) -> Result<reqwest::Response, AiError> {
    match response.status().as_u16() {
        200..=299 => Ok(response),
        429 => Err(AiError::RateLimited),
        status => Err(AiError::Service(status)),
    }
}

pub async fn chat(system: String, user: String, key: &str) -> Result<String, AiError> {
    let response = client()?.post(format!("{BASE}/chat/completions")).bearer_auth(key)
        .json(&serde_json::json!({"model": CHAT_MODEL, "messages": [
            {"role":"system", "content":system}, {"role":"user", "content":user}],
            "temperature":1, "max_tokens":3000, "response_format":{"type":"json_object"}}))
        .send().await.map_err(|error| AiError::Network(error.to_string()))?;
    let body: ChatResponse = checked(response).await?.json().await.map_err(|_| AiError::InvalidResponse)?;
    body.choices.into_iter().next().map(|choice| choice.message.content)
        .filter(|content| !content.trim().is_empty()).ok_or(AiError::InvalidResponse)
}

#[derive(Deserialize)]
struct ImageResponse { images: Vec<ImageUrl> }
#[derive(Deserialize)]
struct ImageUrl { url: String }

fn image_body(prompt: &str) -> serde_json::Value {
    serde_json::json!({"model":IMAGE_MODEL, "prompt":prompt, "image_size":"1328x1328",
        "num_inference_steps":50, "cfg":4,
        "negative_prompt":"photograph, 3D render, grid background, graph paper, human, person, pawn, silhouette, color swatches, palette chart, color strips, sample squares, design sheet, legend, caption, signature, logo, watermark, AI-generated label, letters, text, gradients, blur, soft shadows"})
}

fn image_url(body: ImageResponse) -> Result<reqwest::Url, AiError> {
    let image = body.images.into_iter().next().ok_or(AiError::InvalidResponse)?;
    let url = reqwest::Url::parse(&image.url).map_err(|_| AiError::InvalidResponse)?;
    let host = url.host_str().unwrap_or_default();
    if url.scheme() != "https" || !(host.ends_with(".siliconflow.cn") || host.ends_with(".aliyuncs.com")) {
        return Err(AiError::InvalidResponse);
    }
    Ok(url)
}

pub async fn image(prompt: &str, key: &str) -> Result<Vec<u8>, AiError> {
    let client = client()?;
    let response = client.post(format!("{BASE}/images/generations")).bearer_auth(key)
        .header("X-Enable-Watermark", "0")
        .json(&image_body(prompt)).send().await.map_err(|error| AiError::Network(error.to_string()))?;
    let body: ImageResponse = checked(response).await?.json().await.map_err(|_| AiError::InvalidResponse)?;
    // 图片链接会过期，立即下载后交给现有资产存储；下载请求不携带 API Key。
    let response = client.get(image_url(body)?).send().await.map_err(|_| AiError::Network("生成图片下载失败".into()))?;
    let bytes = checked(response).await?.bytes().await.map_err(|_| AiError::InvalidResponse)?;
    if bytes.is_empty() { return Err(AiError::InvalidResponse); }
    Ok(bytes.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn image_contract_uses_siliconflow_fields() {
        let body = image_body("A silver bookmark.");
        assert_eq!(body["image_size"], "1328x1328");
        assert!(body.get("size").is_none() && body.get("response_format").is_none());
        let response = serde_json::from_str(r#"{"images":[{"url":"https://s3.siliconflow.cn/picture.png"}]}"#).unwrap();
        assert_eq!(image_url(response).unwrap().scheme(), "https");
        assert!(image_url(ImageResponse { images: vec![] }).is_err());
        assert!(image_url(ImageResponse { images: vec![ImageUrl { url:"file:///private".into() }] }).is_err());
        assert!(image_url(ImageResponse { images: vec![ImageUrl { url:"https://127.0.0.1/private".into() }] }).is_err());
    }
}
