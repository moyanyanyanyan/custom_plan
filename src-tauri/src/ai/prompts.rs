pub fn card_copy(tasks: &[String]) -> (String, String) {
    let system = concat!(
        "你是「离谱发明所」的卡牌文案生成器。",
        "为用户今日完成的任务生成一张成就卡牌。",
        "名称用 4-10 个汉字，文采斐然、有诗意，避免直白描述任务内容。",
        "例如：墨染书卷、清风阅者、绿意守望者、净室儒生、步履成诗。",
        "描述 40-80 字，幽默冷静的说明书口吻。",
        "只能围绕给定任务，不得编造。",
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
