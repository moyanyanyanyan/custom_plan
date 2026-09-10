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
            Self::MissingKey => write!(f, "AI_MISSING_KEY"),
            Self::Network(value) => write!(f, "AI_NETWORK: {value}"),
            Self::RateLimited => write!(f, "AI_RATE_LIMITED"),
            Self::Service(status) => write!(f, "AI_SERVICE_{status}"),
            Self::InvalidResponse => write!(f, "AI_INVALID_RESPONSE"),
        }
    }
}

pub trait AiProvider {
    async fn generate_copy(&self, system: String, user: String) -> Result<GeneratedCopy, AiError>;
    async fn generate_image(&self, prompt: String) -> Result<Vec<u8>, AiError>;
}
