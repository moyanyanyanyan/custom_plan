use std::fmt::{Display, Formatter};
use super::models::GeneratedCopy;

#[derive(Debug)]
pub enum AiError {
    MissingKey,
    Network(String),
    RateLimited,
    Service(u16),
    InvalidResponse,
    Attempts(Vec<(&'static str, AiError)>),
}

impl Display for AiError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingKey => write!(
                f,
                "尚未配置 API Key，请在「研究所设置」选择服务商并填写该平台的密钥 [AI_MISSING_KEY]"
            ),
            Self::Network(value) => write!(f, "网络连接失败，请检查网络后重试：{value} [AI_NETWORK]"),
            Self::RateLimited => write!(f, "AI 服务当前限流，请稍后再试 [AI_RATE_LIMITED]"),
            Self::Service(401) => write!(f, "身份验证失败（HTTP 401）：密钥无效、已失效或不属于该服务，请在研究所设置中更新对应服务的 API Key [AI_SERVICE_401]"),
            Self::Service(403) => write!(f, "访问被拒绝（HTTP 403）：请检查密钥的模型权限或账户限制 [AI_SERVICE_403]"),
            Self::Service(402) => write!(f, "账户支付或额度不足（HTTP 402），请检查服务账户余额 [AI_SERVICE_402]"),
            Self::Service(status @ (400 | 404 | 422)) => write!(f, "AI 接口、模型或请求参数不可用（HTTP {status}），请检查服务配置 [AI_SERVICE_{status}]"),
            Self::Service(status) => write!(f, "AI 服务返回异常（HTTP {status}），请稍后重试 [AI_SERVICE_{status}]"),
            Self::InvalidResponse => write!(f, "AI 返回内容无法解析 [AI_INVALID_RESPONSE]"),
            Self::Attempts(failures) => {
                for (index, (service, error)) in failures.iter().enumerate() {
                    if index > 0 { write!(f, "；")?; }
                    write!(f, "{} {service}：{error}", if index == 0 { "首选服务" } else { "备用服务" })?;
                }
                Ok(())
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AiError;
    #[test]
    fn authentication_failure_requires_configuration_not_waiting() {
        let message = AiError::Service(401).to_string();
        assert!(message.contains("更新") && message.contains("401"));
        assert!(!message.contains("稍后"));
    }
    #[test]
    fn secondary_authentication_error_does_not_hide_primary_failure() {
        let message = AiError::Attempts(vec![("TokenDance", AiError::Service(503)), ("阶跃星辰", AiError::Service(401))]).to_string();
        assert!(message.contains("首选服务 TokenDance") && message.contains("503"));
        assert!(message.contains("备用服务 阶跃星辰") && message.contains("401"));
        assert!(message.find("503").unwrap() < message.find("401").unwrap());
    }
}

pub trait AiProvider {
    async fn generate_copy(&self, system: String, user: String) -> Result<GeneratedCopy, AiError>;
    async fn generate_image(&self, prompt: String) -> Result<Vec<u8>, AiError>;
}
