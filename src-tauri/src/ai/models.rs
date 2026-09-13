use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GeneratedCopy {
    pub name: String,
    pub description: String,
    /// 供文生图使用的英文场景描述（背景 + 动作 + 道具）。
    /// 由文案模型在生成名称/描述时一并产出，使插画真正贴合卡牌标题与内容。
    /// `default` 保证旧格式（只有 name/description）的响应仍能解析。
    #[serde(default)]
    pub scene: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct StepSuggestion {
    pub steps: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
pub struct Choice {
    pub message: Message,
}

#[derive(Debug, Deserialize)]
pub struct Message {
    #[serde(default)]
    pub content: String,
    /// 推理模型（step-3.7-flash / deepseek-v4-flash）会把思考过程放在这里。
    /// token 预算被思考吃光时 content 会是空串，需要回退到这段文本里找 JSON。
    #[serde(default)]
    pub reasoning_content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImageResponse {
    pub data: Vec<ImageData>,
}

#[derive(Debug, Deserialize)]
pub struct ImageData {
    pub b64_json: Option<String>,
}
