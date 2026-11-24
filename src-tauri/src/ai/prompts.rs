pub fn card_copy(tasks: &[String], rank: &str) -> (String, String) {
    (include_str!("card-copy.txt").to_string(),
     format!("普通牌点数：{rank}\n今日任务（下标从0开始）：{}", serde_json::to_string(tasks).unwrap_or_default()))
}

/// 卡牌仅使用物品文生图；原始任务和中文名称不直接进入图片提示词。
pub fn card_art(scene: Option<&str>) -> String {
    let body = scene.map(str::trim).filter(|s| !s.is_empty()).unwrap_or("A small silver seal with abstract geometric markings.");
    let body: String = body.chars().take(400).collect();
    format!("Flat 2D retro RPG inventory sprite, NOT a photo or 3D render. Subject: {body} Render the entire object itself on a 64x64 pixel grid enlarged by nearest neighbor: large flat square pixels, staircase edges, a small number of solid colors applied only to the object, upper-left light. Exactly one centered object on a solid pure white background; all space outside its silhouette is empty white. No color swatches, color strips, palette charts, sample squares, design sheets, legends, captions, signatures, logos, watermarks or AI-generated labels. No grid lines, gradients, soft shadows, blur, perspective depth, photographic texture, or designs printed on a realistic object. No people, silhouettes, faces, hands, body parts, text, letters or frame.")
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
    #[test]
    fn card_prompt_uses_object_art_and_task_evidence() {
        let (system, user) = card_copy(&["读书".into()], "5");
        assert!(system.contains("taskIndex"));
        assert!(system.contains("一段连续"));
        assert!(user.contains("读书") && user.contains("5"));
        let art = card_art(Some("A silver bookmark."));
        assert!(art.contains("A silver bookmark."));
        assert!(art.contains("No people"));
        assert!(!art.contains("reference image"));
        assert!(card_art(None).contains("silver seal"));
    }
}
