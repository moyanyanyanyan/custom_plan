use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GeneratedCopy {
    pub name: String,
    pub description: String,
}

/// 道具附魔：名称与效果由 AI 按来源卡牌生成，kind 决定稀有度光效。
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ItemEnchantment {
    pub name: String,
    pub effect: String,
    #[serde(default)]
    pub kind: Option<String>,
}

/// 道具文案：名称/描述必须与来源卡牌强相关，art 是给图片模型的英文视觉描述。
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct GeneratedItem {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub enchantment: Option<ItemEnchantment>,
    #[serde(default)]
    pub art: Option<String>,
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
    pub content: String,
    /// 阶跃星辰 step-3.7-flash 是推理模型：思考过程单独回在 reasoning_content 里，
    /// 且与 content 共用 max_tokens 预算（预算被吃光时 content 返回空串）。
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
