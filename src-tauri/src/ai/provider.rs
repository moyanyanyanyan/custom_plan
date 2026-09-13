use std::fmt::{Display, Formatter};
use super::models::GeneratedCopy;

#[derive(Debug)]
pub enum AiError {
    MissingKey,
    Network(String),
    RateLimited,
    Service(u16),
    InvalidResponse,
}

impl Display for AiError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingKey => write!(
                f,
                "尚未配置 TokenDance API Key，请打开「研究所设置」填入（密钥在 tokendance.space/keys 创建，以 sk- 开头）[AI_MISSING_KEY]"
            ),
            Self::Network(value) => write!(f, "网络连接失败，请检查网络后重试：{value} [AI_NETWORK]"),
            Self::RateLimited => write!(f, "AI 服务当前限流，请稍后再试 [AI_RATE_LIMITED]"),
            Self::Service(status) => write!(f, "AI 服务返回异常（HTTP {status}），请稍后重试 [AI_SERVICE_{status}]"),
            Self::InvalidResponse => write!(f, "AI 返回内容无法解析 [AI_INVALID_RESPONSE]"),
        }
    }
}

pub trait AiProvider {
    async fn generate_copy(&self, system: String, user: String) -> Result<GeneratedCopy, AiError>;
    async fn generate_image(&self, prompt: String) -> Result<Vec<u8>, AiError>;
}
