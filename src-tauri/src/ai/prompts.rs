pub fn card_copy(tasks: &[String]) -> (String, String) {
    let system = concat!(
        "你是「离谱发明所」的卡牌文案生成器。",
        "为用户每日完成的任务生成一张成就卡牌。",
        "名称用 4-10 个汉字的称号式标题，例如：",
        "学识达人、学习小能手、代码匠人、逻辑大师、实验之王、Bug 猎人、",
        "清洁大师、整理之王、空间魔术师、厨艺达人、厨房魔法师、",
        "运动之星、活力全开、坚持达人、创意大师、艺术先锋、造梦者、",
        "书写者、笔下生花、沟通达人、协作之星、植物守护者、自然之友、",
        "充电完成、日行一事、生活艺术家、持之以恒、行动派。",
        "描述 40-80 字，使用幽默冷静的说明书口吻。",
        "只能围绕给定任务，不得编造其他事实。",
        "只输出 JSON：{\"name\":\"名称\",\"description\":\"描述\"}"
    ).to_string();
    (system, format!("今日完成任务：{}", tasks.join("、")))
}

pub fn card_art(name: &str, description: &str) -> String {
    format!(
        "Cute chibi scene. ABSOLUTELY NO TEXT, NO WATERMARK, NO SIGNATURE, NO LETTERS, NO WORDS, NO CHINESE CHARACTERS anywhere. \
         MAIN CHARACTER (EXACT design, NEVER change): female chibi, short spiky silver-blue hair, large blue eyes, white hoodie with blue sleeves and blue hood, blue bowtie, white skirt, white shoes with blue trim. \
         NEVER change outfit, hair, gender, proportions or any design detail. \
         Show this exact character doing ONE simple action related to \"{name}\" ({description}) in a relevant background scene. \
         No card frame, no borders. Fill the canvas edge to edge."
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
