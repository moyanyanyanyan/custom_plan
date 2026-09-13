pub fn card_copy(tasks: &[String]) -> (String, String) {
    let system = concat!(
        "你是「离谱发明所」的卡牌文案生成器。",
        "为用户今日完成的任务生成一张成就卡牌。",
        "名称用 4-10 个汉字，文采斐然、有诗意，避免直白描述任务内容。",
        "例如：墨染书卷、清风阅者、绿意守望者、净室儒生、步履成诗。",
        "描述 40-80 字，幽默冷静的说明书口吻。",
        "scene 字段：一段英文场景描述，20-40 个单词，供文生图使用。",
        "scene 必须同时写清三件事：①背景环境——地点、时间、光线与色调；②角色的具体动作与姿态；③两三件与主题相关的道具。",
        "背景与动作必须直接呼应你刚写的名称与描述，让画面一眼就能看出这张卡在讲什么，而不是一个通用实验室。",
        "scene 里严禁描述任何文字、字母、汉字、招牌、标签、铭牌或书写内容；也不要写相机参数、画质词与风格词。",
        "只能围绕给定任务，不得编造。",
        "只输出 JSON：{\"name\":\"名称\",\"description\":\"描述\",\"scene\":\"english scene\"}"
    ).to_string();
    (system, format!("今日完成任务：{}", tasks.join("、")))
}

/// 插画 prompt 的场景段：优先使用文案模型产出的 scene（已按标题/内容定制）；
/// 缺失时退回「自行按标题设计场景」的强约束，绝不退回到千篇一律的固定背景。
fn scene_clause(name: &str, description: &str, scene: Option<&str>) -> String {
    match scene.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => format!("Scene to depict, follow it strictly: {value}"),
        None => format!(
            "Design the scene yourself so that the background, the props and the character's action \
             all directly express the theme \"{name}\" ({description}). Choose a location, a time of day, \
             a light mood and two or three props that a viewer would immediately associate with this exact theme. \
             Never reuse a generic laboratory backdrop."
        ),
    }
}

pub fn card_art(name: &str, description: &str, scene: Option<&str>) -> String {
    format!(
        "Cute chibi scene. ABSOLUTELY NO TEXT, NO WATERMARK, NO SIGNATURE, NO LETTERS, NO WORDS, NO CHINESE CHARACTERS anywhere. \
         MAIN CHARACTER (EXACT design, NEVER change): female chibi, short spiky silver-blue hair, large blue eyes, white hoodie with blue sleeves and blue hood, blue bowtie, white skirt, white shoes with blue trim. \
         ANATOMY LOCK: exactly one head, one torso, exactly two shoulders, exactly two arms, exactly two hands and exactly five fingers per hand; both arms must connect naturally to the two shoulders. NO extra arms, NO third hand, NO duplicate hand, NO detached limb, NO duplicated body parts, NO malformed anatomy, NO multiple copies of the character. \
         {}. \
         The character's pose and facial expression must match the card \"{name}\" ({description}) and the scene above. Keep at most one held prop so both hands remain clearly readable; do not show a complex multi-object pose. \
         NEVER change outfit, hair, gender, proportions or any design detail. \
         Use a normal stable pose, not a motion trail or anatomical afterimage. \
         No card frame, no borders. Fill the canvas edge to edge.",
        scene_clause(name, description, scene)
    )
}

pub fn slime_copy(task: &str) -> (String, String) {
    ("为拖延任务生成幽默史莱姆名称和描述，只输出 name/description JSON。".into(),
     format!("来源任务：{task}"))
}

pub fn task_steps(title: &str) -> (String, String) {
    (concat!(
        "把复杂任务拆成 2 到 6 个可以直接执行的中文步骤，每步不超过 20 字。",
        "不要补充用户没有提供的事实，只输出 JSON：{\"steps\":[\"步骤\"]}"
    ).into(), format!("任务：{title}"))
}

/// 道具文案：输入是一张卡牌，输出必须与这张卡牌强相关（不得另起炉灶）。
pub fn item_copy(card_name: &str, card_description: &str) -> (String, String) {
    let system = concat!(
        "你是「离谱发明所」的像素道具生成器。用户会给你一张卡牌，你要把这张卡牌锻造成一件道具。",
        "硬性要求：道具名 2-5 个汉字；描述 20-50 字，说明书口吻，必须能看出与卡牌的关联",
        "（沿用卡牌里的意象、物件或那句笑话的内核），不得编造卡牌之外的事实。",
        "enchantment 是附魔，可以不附魔（用 null）；附魔名 2-6 个汉字，effect 是一句话的荒诞效果，",
        "kind 只能取 title/upgrade/cursed/special 之一。",
        "art 是给绘图模型的英文视觉描述，15-30 词，写清这件道具的材质、颜色、形状与一个最醒目的细节，",
        "必须与道具名一致；不要出现任何文字、招牌、标签。",
        "只输出 JSON：{\"name\":\"名称\",\"description\":\"描述\",\"enchantment\":{\"name\":\"\",\"effect\":\"\",\"kind\":\"special\"},\"art\":\"english visual\"}"
    ).to_string();
    (system, format!("卡牌名称：{card_name}\n卡牌描述：{card_description}"))
}

/// 道具像素图：中间那颗像素精灵。风格与卡牌插画同源（16-bit 像素），但只画单个物件。
pub fn item_art(name: &str, art: &str) -> String {
    // 注意：**绝不能把中文道具名写进提示词**。2026-09-13 实证——提示词里带上
    // "（item name：食箸流光）"时，step-image-edit-2 会把名字当标题画在图顶部（图上出现
    // 中文字），末尾那串 no text 负向词压不住它；两条独立视觉通道（modlens / stepfun 直连）
    // 都确证图上有字。此外这也是组长拍板的铁律：插画是纯图，文字一律由 CSS 在界面层排。
    // 名字只在 art 缺失（理论上只有降级件，降级件根本不生图）时作为兜底视觉线索。
    let visual = if art.trim().is_empty() { name } else { art.trim() };
    format!(
        "16-bit farming-sim style pixel art item icon of a single object: {visual}. \
         Hand-drawn on a strict 32x32 pixel grid and enlarged with nearest-neighbour scaling, \
         so every pixel is one crisp flat square of colour: chunky hard blocky edges, \
         absolutely no anti-aliasing, no gradients, no dithering, no soft shading, no blur, \
         no 3D rendering, no photo texture. Cozy limited palette of at most 16 colours, \
         warm saturated hues, one single-pixel dark outline hugging the whole silhouette. \
         Exactly one object, centered, slight three-quarter view, simple readable shape, \
         clear gaps between parts, filling most of the frame. \
         Plain flat dark navy background, no scenery, no ground shadow, no glow, no sparkles. \
         The picture shows the object and nothing else: no text at all, no letters, no numbers, \
         no Chinese characters, no title, no caption, no label, no signature, no logo, \
         no watermark, no border, no frame."
    )
}
