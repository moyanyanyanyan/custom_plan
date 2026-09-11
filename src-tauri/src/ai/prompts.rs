pub fn card_copy(tasks: &[String]) -> (String, String) {
    let system = concat!(
        "你是「离谱发明所」的卡牌文案生成器。",
        "卡牌名称 4-10 个汉字，描述 40-80 字，使用幽默冷静的说明书口吻。",
        "只能围绕给定任务，不得编造其他事实。",
        "只输出 JSON：{\"name\":\"名称\",\"description\":\"描述\"}"
    ).to_string();
    (system, format!("今日完成任务：{}", tasks.join("、")))
}

pub fn card_art(name: &str, description: &str) -> String {
    format!(
        "荒诞发明卡牌的方形插画，主题「{name}」（{description}）。深蓝实验室背景，\
         神秘发明装置居中，蒸汽朋克和霓虹线条风格，不得出现文字。"
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
