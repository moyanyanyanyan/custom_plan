pub fn card_copy(tasks: &[String]) -> (String, String) {
    let system = concat!(
        "你是「离谱发明所」的卡牌文案生成器。",
        "为用户今日完成的任务生成一张成就卡牌。",
        "名称用 4-10 个汉字，文采斐然、有诗意，避免直白描述任务内容。",
        "例如：墨染书卷、清风阅者、绿意守望者、净室儒生、步履成诗。",
        "描述 40-80 字，幽默冷静的说明书口吻。",
        "scene 字段：一句英文场景描述，20-35 个单词，供文生图使用。",
        "scene 必须通过这条硬指标：**只看这一句、看不到任务原文的人，也能猜出今天大概做了什么**。",
        "必须同时写清三件事：①具体地点与时间光线（如清晨的厨房、深夜书桌前的台灯）；②角色正在做的一个明确动作，用动词写出画面（如举筷夹菜、翻开书页、弯腰系鞋带）；③两件与这件事直接相关、能被画出来的道具，写清种类与样子。",
        "禁止空泛：不得只写 a cozy room / a laboratory / a desk 这类与任务无关的通用背景，不得写抽象心理活动、情绪词或结果评价（如 feeling accomplished）。",
        "示例（任务「吃饭」→ 22 词）：At a wooden dining table in warm morning light, she raises chopsticks to lift a steamed bun beside a bowl of congee.",
        "scene 里严禁描述任何文字、字母、汉字、招牌、标签、铭牌或书写内容；也不要写相机参数、画质词与风格词。",
        "只能围绕给定任务，不得编造。",
        "只输出 JSON：{\"name\":\"名称\",\"description\":\"描述\",\"scene\":\"english scene\"}"
    ).to_string();
    (system, format!("今日完成任务：{}", tasks.join("、")))
}

/// 卡牌插画提示词（唯一真源，前端不拼提示词）。
///
/// 两条硬约束决定这里的写法，改动前务必先读：
/// 1. **总长必须自己压进 500 字符**。有参考图时的主路径走 `/v1/images/edits`，该端点 prompt
///    上限 512 字符，`stepfun.rs::clamp_prompt` 按 500 字符安全截断 —— 一旦超长就**从尾部整段砍掉**。
///    旧版提示词约 900 字符，于是排在 600 字符处的 scene（背景+动作）从来没被送出过，
///    生图模型只看到角色与骨架约束，画出来的背景自然与卡牌主题无关（2026-09-13 用户反馈的根因）。
///    因此：场景段放最前，预算按 head/tail 反算后再截 scene，宁可截场景尾巴也不丢尾部约束。
/// 2. **提示词里绝不出现中文**（中文名会被 step-image-edit-2 当标题画在图上，2026-09-13 实测）。
///    主题相关性只能靠英文 scene 承载，所以 name/description 不再进图。
pub fn card_art(scene: Option<&str>) -> String {
    const LIMIT: usize = 500;
    let head = "Chibi girl from the reference image, actively doing this, in this exact place: ";
    // tail 必须短：head+tail 越长，留给 scene（20-35 词 ≈ 150-200 字符）的预算越少，
    // 旧版 tail 把预算压到只剩约 120 字符，scene 会被拦腰截断 —— 那等于场景又没画全。
    // 角色外形改由参考图承担（edits 端点实测能锁住角色），这里只留一句锁定 + 骨架 + 禁文字。
    let tail = " Same girl as in the reference image, same hair, same outfit, same colours. \
                Draw the props and the scene described above. \
                Exactly one head, two arms, two hands. \
                No text, no letters, no watermark, no frame, no border. Fill the canvas.";
    let body = match scene.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => value,
        // scene 缺失（AI 降级/旧响应）时的兜底：仍要求具体场景与道具，绝不退回空实验室。
        None => "a specific everyday scene with two concrete props that fit today's achievement, \
                 never an empty generic laboratory",
    };
    let budget = LIMIT
        .saturating_sub(head.chars().count() + tail.chars().count())
        .max(80);
    let clamped: String = body.chars().take(budget).collect();
    format!("{head}{clamped}{tail}")
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

#[cfg(test)]
mod tests {
    use super::*;

    /// 硬约束：有参考图时走 /v1/images/edits，clamp_prompt 按 500 字符截断；超长就从尾部整段砍掉。
    /// 旧版提示词约 900 字符，scene 段从来没被送出过 —— 这个断言就是那条回归的守门人。
    #[test]
    fn card_art_stays_within_edits_limit() {
        let long_scene = "a wooden table at breakfast ".repeat(60);
        let prompt = card_art(Some(&long_scene));
        assert!(
            prompt.chars().count() <= 500,
            "card_art 必须 ≤500 字符，实际 {}",
            prompt.chars().count()
        );
        assert!(prompt.ends_with("Fill the canvas."));
        assert!(prompt.contains("No text, no letters, no watermark"));
    }

    /// 预算必须容得下一条完整的 30 词左右场景 —— 否则等于「场景写了却被截掉一半」，
    /// 又退回到背景与任务不相关的老问题。这条测试是预算下限的守门人。
    #[test]
    fn card_art_keeps_a_realistic_scene_intact() {
        let scene = "At a wooden dining table in warm morning light, she raises chopsticks to lift a \
                     steamed bun from a white plate beside a bowl of congee, a teacup and a small jar of pickles.";
        let prompt = card_art(Some(scene));
        assert!(
            prompt.contains("a small jar of pickles."),
            "scene 尾部被截断了，留给 scene 的预算不足：{prompt}"
        );
    }

    /// scene 永远排在最前，超长时被截掉的是场景尾巴，而不是尾部的角色/文字约束。
    #[test]
    fn card_art_keeps_scene_before_tail() {
        let prompt = card_art(Some("Sitting on a park bench feeding pigeons at noon."));
        let scene_pos = prompt.find("park bench").expect("scene 必须出现");
        let tail_pos = prompt.find("Same girl as in the reference image").expect("tail 必须出现");
        assert!(scene_pos < tail_pos);
    }

    /// 中文名会被 step-image-edit-2 当标题画在图上，提示词必须是纯 ASCII。
    #[test]
    fn card_art_contains_no_cjk() {
        let prompt = card_art(Some("At a wooden dining table she lifts a steamed bun."));
        assert!(
            !prompt.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c)),
            "card_art 不得出现中文"
        );
    }

    /// scene 缺失（AI 降级 / 旧格式响应）时仍要求具体场景与道具，绝不退回空实验室。
    #[test]
    fn card_art_falls_back_when_scene_missing() {
        for scene in [None, Some("   ")] {
            let prompt = card_art(scene);
            assert!(prompt.contains("never an empty generic laboratory"));
            assert!(prompt.contains("actively doing this"));
        }
    }

    /// 文案模型必须被明确要求写出「只读 scene 就能猜出任务」的具体场景。
    #[test]
    fn card_copy_demands_task_relevant_scene() {
        let (system, user) = card_copy(&["吃饭".to_string()]);
        assert!(system.contains("20-35"));
        assert!(system.contains("猜出今天大概做了什么"));
        assert!(system.contains("两件与这件事直接相关"));
        assert!(user.contains("吃饭"));
    }
}
