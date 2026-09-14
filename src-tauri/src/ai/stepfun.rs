use super::{models::{ChatResponse, GeneratedCopy, GeneratedItem, ImageResponse, ItemEnchantment, StepSuggestion}, provider::{AiError, AiProvider}};
use crate::data::AppStore;
use base64::Engine;
use std::time::Duration;

/// 一条可用的 AI 后端：端点 + 模型名 + 生图尺寸三者必须成套，不能混用。
struct Route {
    chat_url: &'static str,
    image_url: &'static str,
    /// 图生图端点。官方 step-image-edit-2 的 generations 是**纯文生图**：body 里的 image 字段
    /// 被静默忽略（2026-09-13 实测四种字段名 image / init_image / image_url / image:[...]
    /// 全部返回 200 但画面完全不跟随参考图）。只有 /v1/images/edits（multipart/form-data）
    /// 才真正参考输入图：实测带参考图 200 且角色锁定，不带图则 400 `image file is required`。
    edits_url: &'static str,
    chat_model: &'static str,
    image_model: &'static str,
    image_size: &'static str,
}

/// TokenDance 网关（key 形如 sk-…）。生图走 seedream，尺寸 1920x1920。
static TOKENDANCE: Route = Route {
    chat_url: "https://tokendance.space/gateway/v1/chat/completions",
    image_url: "https://tokendance.space/gateway/v1/images/generations",
    edits_url: "https://tokendance.space/gateway/v1/images/edits",
    chat_model: "deepseek-v4-flash",
    image_model: "seedream-5.0-lite",
    image_size: "1920x1920",
};

/// 阶跃星辰官方 API（key 形如 1sMPgJ…，非 sk- 前缀）。
///
/// size 只能用官方文档列出的档位：1024x1024 / 768x1360 / 896x1184 / 1360x768 / 1184x896；
/// 传 1920x1920 会 400 `size_invalid`。
static STEPFUN: Route = Route {
    chat_url: "https://api.stepfun.com/v1/chat/completions",
    image_url: "https://api.stepfun.com/v1/images/generations",
    edits_url: "https://api.stepfun.com/v1/images/edits",
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

/// 依次尝试的后端列表：首选后端失败（401 / 网络不通 / 429 / 5xx）就换另一条重试。
///
/// 为什么需要它：`route_for` 只能靠 key 形态猜后端，一旦猜错（例如官方 key 恰好是 sk- 前缀、
/// 或用户临时换了另一家 key），表现就是「生成不了图片」。两条都试过之后，用户手上是哪家的
/// key 都能出图，不再依赖形态判断是否精准。注意尺寸/模型必须跟着各自后端成套切换。
fn route_chain(key: &str) -> [&'static Route; 2] {
    if std::ptr::eq(route_for(key), &TOKENDANCE) {
        [&TOKENDANCE, &STEPFUN]
    } else {
        [&STEPFUN, &TOKENDANCE]
    }
}

/// 角色三视图参考图（编译期内嵌，随仓库分发）。
///
/// 2026-09-13 用户要求「锁死三张参考图」：合并进来的版本改用
/// public/onboarding/avatar.jpg（用户头像）当参考图，生成出来的角色会跟着头像变，
/// 与软件固定的角色形象不符。这里恢复项目自带的三视图，并在 .gitignore 里为
/// src-tauri/assets/*.jpg 开了例外，保证干净检出（clone 后直接编译）也能拿到这三张图。
const REF_FRONT: &[u8] = include_bytes!("../../assets/character_front.jpg");
const REF_SIDE: &[u8] = include_bytes!("../../assets/character_side.jpg");
const REF_BACK: &[u8] = include_bytes!("../../assets/character_back.jpg");

/// 按 CHARACTER_REF_VARIANT 选一张三视图：front（默认）| side | back。
fn builtin_ref() -> &'static [u8] {
    match std::env::var("CHARACTER_REF_VARIANT").ok().as_deref() {
        Some("side") => REF_SIDE,
        Some("back") => REF_BACK,
        _ => REF_FRONT,
    }
}

pub struct StepFunProvider;

impl AiProvider for StepFunProvider {
    async fn generate_copy(&self, system: String, user: String) -> Result<GeneratedCopy, AiError> {
        generate_copy(system, user).await
    }
    async fn generate_image(&self, prompt: String) -> Result<Vec<u8>, AiError> {
        generate_image(prompt).await
    }
}

/// 没有保存过的 key 时读环境变量：TOKENDANCE_API_KEY 优先，其次 STEPFUN_API_KEY。
/// 具体走哪个后端由 `route_for` 按 key 形态决定，不在这里硬编码。
fn env_api_key() -> Result<String, AiError> {
    std::env::var("TOKENDANCE_API_KEY")
        .or_else(|_| std::env::var("STEPFUN_API_KEY"))
        .map_err(|_| AiError::MissingKey)
}

/// 内嵌的默认 key（TokenDance 网关）：全新安装、存档缺失或被设置面板清空时兜底，保证开箱即可出图。
pub const BUILTIN_API_KEY: &str = "sk-b4da085962e5cffad4c98dbad91b7d5bacae87dfa8ade5d7";

/// 读取本机 DSH 凭据里的 STEPFUN_API_KEY（开发机用；`%USERPROFILE%\.dsh\.credentials.yaml`）。
fn dsh_credentials_key() -> Option<String> {
    let home = std::env::var_os("USERPROFILE")?;
    let path = std::path::Path::new(&home).join(".dsh").join(".credentials.yaml");
    let bytes = std::fs::read(path).ok()?;
    let content = String::from_utf8_lossy(&bytes);
    content.lines().find_map(|line| {
        line.strip_prefix("STEPFUN_API_KEY:")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string())
    })
}

/// 终极兜底 key：优先本机 DSH 凭据，否则内嵌默认 key。
pub fn fallback_api_key() -> String {
    dsh_credentials_key().unwrap_or_else(|| BUILTIN_API_KEY.into())
}

/// key 解析链：本地设置 → 环境变量 → 内嵌兜底（DSH 凭据 / `BUILTIN_API_KEY`）。
/// 存档里没有、或被人清空时**自动补回并写回存档**——否则全新下载的应用会在第一次生成时
/// 直接报 [AI_MISSING_KEY]（2026-09-13 线上反馈的「无法生成图片」就是这个形态）。
pub fn stored_key(store: &AppStore) -> Result<String, AiError> {
    let mut data = store.load().map_err(|e| AiError::Network(e.to_string()))?;
    if let Some(value) = data.settings.get("stepfunApiKey").and_then(|v| v.as_str()) {
        if !value.trim().is_empty() {
            return Ok(value.trim().into());
        }
    }
    if let Ok(value) = env_api_key() {
        return Ok(value);
    }
    let key = fallback_api_key();
    let revision = data.revision;
    if !data.settings.is_object() {
        data.settings = serde_json::Value::Object(Default::default());
    }
    if let Some(object) = data.settings.as_object_mut() {
        object.insert("stepfunApiKey".into(), serde_json::Value::String(key.clone()));
        let _ = store.save(data, revision);
    }
    Ok(key)
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

/** 卡牌文案专用入口：校验荒诞发明物名称，首次失败时携带原因纠错一次。 */
pub async fn generate_card_copy_with_store(
    system: String, user: String, store: &AppStore,
) -> Result<GeneratedCopy, AiError> {
    generate_card_copy_with_key(system, user, stored_key(store)?).await
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

async fn generate_card_copy_with_key(
    system: String, user: String, key: String,
) -> Result<GeneratedCopy, AiError> {
    let mut request = user.clone();
    for _ in 0..2 {
        let raw = generate_chat_with_key(system.clone(), request, key.clone()).await?;
        match extract_card_copy(&raw) {
            Ok(copy) => return Ok(copy),
            Err((reason, rejected)) => {
                let original = rejected.map(|name| format!("原名称：{name}。"))
                    .unwrap_or_default();
                request = format!(
                    "{user}。上一次输出不合规：{reason}。{original}请纠正后重新输出完整JSON。"
                );
            }
        }
    }
    Err(AiError::InvalidResponse)
}

/// 单次对话请求（只用某一条后端）。
async fn chat_once(route: &'static Route, key: &str, system: &str, user: &str) -> Result<String, AiError> {
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

/// 依次尝试所有后端：首选失败（401 / 网络不通 / 429 / 5xx）就换另一条重试，
/// 这样无论用户拿到的是哪家的 key 都能拿到文案，不再依赖 `route_for` 的形态判断。
/// 注意：`InvalidResponse`（模型答非所问、JSON 解析不了）不换后端，换一条也是白搭。
async fn generate_chat_with_key(system: String, user: String, key: String) -> Result<String, AiError> {
    let mut last = AiError::InvalidResponse;
    for route in route_chain(&key) {
        match chat_once(route, &key, &system, &user).await {
            Ok(raw) => return Ok(raw),
            Err(AiError::InvalidResponse) => return Err(AiError::InvalidResponse),
            Err(error) => last = error,
        }
    }
    Err(last)
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
/// 返回 (原始字节, MIME)。必须是**原始字节**而不是 data URL：
/// 图生图端点 /v1/images/edits 收的是 multipart 文件，data URL 字符串它不认。
fn load_ref() -> Option<(Vec<u8>, &'static str)> {
    if let Ok(custom) = std::env::var("CHARACTER_REF_PATH") {
        let path = std::path::Path::new(&custom);
        if let Ok(bytes) = std::fs::read(path) {
            let mime = sniff_mime(&bytes);
            return Some((bytes, mime));
        }
    }
    let reference = builtin_ref().to_vec();
    let mime = sniff_mime(&reference);
    Some((reference, mime))
}

/// multipart 的边界串。固定值即可：body 是自己拼的字节，不参与任何外部输入。
const MULTIPART_BOUNDARY: &str = "----absurd-invention-lab-ref-20260913";

fn push_field(body: &mut Vec<u8>, name: &str, value: &str) {
    let header = format!(
        "--{MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n"
    );
    body.extend_from_slice(header.as_bytes());
}

/// 手拼 multipart/form-data。不引入 reqwest 的 multipart feature（会连带 mime_guess 等依赖）。
fn multipart_body(model: &str, prompt: &str, image: &[u8], mime: &str) -> (String, Vec<u8>) {
    let mut body = Vec::with_capacity(image.len() + 1024);
    push_field(&mut body, "model", model);
    push_field(&mut body, "prompt", prompt);
    push_field(&mut body, "response_format", "b64_json");
    let part = format!(
        "--{MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"reference.jpg\"\r\nContent-Type: {mime}\r\n\r\n"
    );
    body.extend_from_slice(part.as_bytes());
    body.extend_from_slice(image);
    body.extend_from_slice(format!("\r\n--{MULTIPART_BOUNDARY}--\r\n").as_bytes());
    (
        format!("multipart/form-data; boundary={MULTIPART_BOUNDARY}"),
        body,
    )
}

/// edits 端点的 prompt 上限是 512 字符（官方文档），超了会 400。按字符边界安全截断。
fn clamp_prompt(prompt: &str) -> &str {
    const LIMIT: usize = 500;
    if prompt.chars().count() <= LIMIT {
        return prompt;
    }
    let end = prompt
        .char_indices()
        .nth(LIMIT)
        .map(|(index, _)| index)
        .unwrap_or(prompt.len());
    prompt[..end].trim_end()
}

/// 解析生图响应：校验状态码 → 取 b64_json → 解码成字节。
async fn decode_image(response: reqwest::Response) -> Result<Vec<u8>, AiError> {
    let body: ImageResponse = checked(response).await?.json().await
        .map_err(|_| AiError::InvalidResponse)?;
    let encoded = body.data.first().and_then(|item| item.b64_json.as_ref())
        .ok_or(AiError::InvalidResponse)?;
    base64::engine::general_purpose::STANDARD.decode(encoded)
        .map_err(|_| AiError::InvalidResponse)
}

/// 纯文生图（该后端没有 edits、喂不了参考图）时，用一段**英文**角色外观描述顶上，
/// 否则角色会变成随机路人脸。措辞与内嵌参考图一致：白+浅蓝短发、蓝发夹、白裙蓝领结、白大衣蓝边。
/// 铁律：只喂英文视觉描述，绝不喂中文名称——step 系列会把名称当标题画在图上。
const CHARACTER_CLAUSE: &str = "A cute chibi girl with short pale-blue and white hair, a blue hairpin, big blue eyes, wearing a white dress with a blue-white bow and a white coat with blue trim,";

/// 该后端的纯文生图（`/images/generations`，JSON）。
async fn text2img_once(route: &'static Route, key: &str, prompt: &str) -> Result<Vec<u8>, AiError> {
    let composed = format!("{CHARACTER_CLAUSE} {prompt}");
    let body = serde_json::json!({
        "model": route.image_model, "prompt": composed, "n": 1,
        // 尺寸必须用该后端支持的档位：阶跃官方 step-image-edit-2 只接受
        // 1024x1024 / 768x1360 / 896x1184 / 1360x768 / 1184x896，传 1920x1920 会 400 size_invalid。
        "size": route.image_size, "response_format": "b64_json"
    });
    let response = client()?
        .post(route.image_url)
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|e| AiError::Network(e.to_string()))?;
    decode_image(response).await
}

/// 单次生图请求（只用某一条后端；尺寸随该后端成套切换）。
///
/// 有角色参考图时**先试** `/images/edits`（multipart 图生图）——只有这条真读参考图；
/// **该后端不支持 edits 就退回它自己的 `/images/generations` 文生图**。
///
/// 这条「同一后端内部回退」是必需的：TokenDance 网关**没有** edits 端点
/// （2026-09-13 实测 multipart 打 `gateway/v1/images/edits` → 404 Not Found），
/// 而全新安装的用户没有自己的 key、只能落到编译期内嵌 key → 只能走网关。
/// 若这里直接失败，跨后端的 `route_chain` 兜底会拿同一把 sk- key 去打阶跃官方吃 401，
/// 结果是**图片一张都出不来**（卡牌插画、离谱道具像素图全废）。
async fn image_once(route: &'static Route, key: &str, prompt: &str) -> Result<Vec<u8>, AiError> {
    if let Some((bytes, mime)) = load_ref() {
        let (content_type, body) =
            multipart_body(route.image_model, clamp_prompt(prompt), &bytes, mime);
        if let Ok(response) = client()?
            .post(route.edits_url)
            .bearer_auth(key)
            .header("content-type", content_type)
            .body(body)
            .send()
            .await
        {
            if let Ok(image) = decode_image(response).await {
                return Ok(image);
            }
        }
    }
    text2img_once(route, key, prompt).await
}

/// 与 `generate_chat_with_key` 同样的兜底策略：首选后端失败（401 / 网络 / 429 / 5xx）就换另一条重试，
/// 避免「key 形态判断猜错 → 生图永远失败」。
async fn generate_image_with_key(prompt: String, key: String) -> Result<Vec<u8>, AiError> {
    let mut last = AiError::InvalidResponse;
    for route in route_chain(&key) {
        match image_once(route, &key, &prompt).await {
            Ok(bytes) => return Ok(bytes),
            Err(AiError::InvalidResponse) => return Err(AiError::InvalidResponse),
            Err(error) => last = error,
        }
    }
    Err(last)
}

pub fn extract_copy(raw: &str) -> Option<GeneratedCopy> {
    let candidate = raw.trim().trim_start_matches("```json").trim_start_matches("```")
        .trim_end_matches("```").trim();
    let start = candidate.find('{')?;
    let end = candidate.rfind('}')? + 1;
    serde_json::from_str(&candidate[start..end]).ok()
}

/** 名称校验只用于卡牌；史莱姆等其他文案仍沿用通用 JSON 解析。 */
pub fn validate_card_name(name: &str) -> Result<(), String> {
    let value = name.trim();
    let length = value.chars().count();
    if length < 5 || length > 12 { return Err("名称必须为5-12个汉字".into()); }
    if !value.chars().all(is_han) { return Err("名称只能包含汉字".into()); }
    for title in ["达人", "大师", "王者", "守望者", "小能手"] {
        if value.contains(title) { return Err(format!("名称不得包含人物称号“{title}”")); }
    }
    if !["装置", "器", "机", "仪", "箱", "炉", "罐"].iter().any(|suffix| value.ends_with(suffix)) {
        return Err("名称必须以器、机、仪、箱、炉、罐或装置结尾".into());
    }
    Ok(())
}

fn is_han(ch: char) -> bool {
    matches!(ch as u32, 0x3400..=0x4DBF | 0x4E00..=0x9FFF | 0xF900..=0xFAFF)
}

fn extract_card_copy(raw: &str) -> Result<GeneratedCopy, (String, Option<String>)> {
    let copy = extract_copy(raw).ok_or_else(|| ("响应中没有可解析的完整JSON".into(), None))?;
    validate_card_name(&copy.name).map_err(|reason| (reason, Some(copy.name.clone())))?;
    if copy.description.trim().is_empty() {
        return Err(("描述不能为空".into(), Some(copy.name)));
    }
    Ok(GeneratedCopy {
        name: copy.name.trim().into(),
        description: copy.description.trim().into(),
        scene: copy.scene.map(|scene| scene.trim().to_string()).filter(|scene| !scene.is_empty()),
    })
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
    use super::{extract_card_copy, extract_copy, extract_item, extract_steps, last_json_block, validate_card_name};
    #[test]
    fn extracts_json_with_or_without_fence() {
        assert_eq!(extract_copy(r#"{"name":"A","description":"B"}"#).unwrap().name, "A");
        assert_eq!(extract_copy("```json\n{\"name\":\"A\",\"description\":\"B\"}\nn```").unwrap().description, "B");
    }
    #[test]
    fn rejects_invalid_copy() { assert!(extract_copy("not json").is_none()); }
    #[test]
    fn validates_absurd_invention_card_names() {
        assert!(validate_card_name("桌面秩序压缩机").is_ok());
        for invalid in ["短小机", "这个名字实在是非常非常漫长的处理装置", "代码Bug处理器", "代码大师处理器", "桌面秩序维护员", ""] {
            assert!(validate_card_name(invalid).is_err(), "应拒绝：{invalid}");
        }
    }
    #[test]
    fn card_copy_requires_valid_name_and_description() {
        assert!(extract_card_copy(r#"{"name":"凌晨代码驯服箱","description":"有效描述"}"#).is_ok());
        assert!(extract_card_copy(r#"{"name":"代码大师","description":"错误"}"#).is_err());
        assert!(extract_card_copy(r#"{"name":"凌晨代码驯服箱","description":""}"#).is_err());
        assert!(extract_card_copy("not json").is_err());
    }
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
