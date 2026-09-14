const INVENTION_ENDINGS = ['装置', '器', '机', '仪', '箱', '炉', '罐'];
const FORBIDDEN_TITLES = ['达人', '大师', '王者', '守望者', '小能手'];

export const CARD_COPY_SYSTEM_PROMPT = '你是「离谱发明所」的卡牌文案生成器。'
  + '为用户今日完成的任务生成一张荒诞发明卡牌。'
  + 'name 必须是具体的机器、装置或物品名称，使用5-12个汉字，不含英文、数字、空格或标点。'
  + '名称应让人联想到至少一项给定任务，但不得直接照抄完整任务名。'
  + '名称保持一本正经的荒诞感，必须以器、机、仪、箱、炉、罐或装置结尾。'
  + '禁止使用达人、大师、王者、守望者、小能手等人物称号。'
  + '合格示例：自动翻页犹豫消除器、桌面秩序压缩机、凌晨代码驯服箱。'
  + 'description 40-80字，使用幽默冷静的说明书口吻。'
  + 'scene 是20-35个英文单词，只看它也应能猜出今天完成了什么。'
  + 'scene 必须写明具体地点和光线、一个明确动作、两件任务相关道具。'
  + 'scene 禁止空泛背景、心理活动、评价、文字、字母、招牌、标签、相机参数和风格词。'
  + '只能围绕给定任务，不得编造。'
  + '只输出JSON：{"name":"名称","description":"描述","scene":"english scene"}';

/** 校验卡牌名称；返回 null 表示合规，否则返回可交给模型纠错的具体原因。 */
export function validateCardName(name) {
  if (typeof name !== 'string' || !name.trim()) return '名称为空';
  const value = name.trim();
  const length = Array.from(value).length;
  if (length < 5 || length > 12) return '名称必须为5-12个汉字';
  if (!/^\p{Script=Han}+$/u.test(value)) return '名称只能包含汉字';
  const forbidden = FORBIDDEN_TITLES.find((word) => value.includes(word));
  if (forbidden) return `名称不得包含人物称号“${forbidden}”`;
  if (!INVENTION_ENDINGS.some((ending) => value.endsWith(ending))) {
    return '名称必须以器、机、仪、箱、炉、罐或装置结尾';
  }
  return null;
}

/** 从模型文本中提取并校验完整卡牌文案。 */
export function parseCardCopy(content) {
  if (typeof content !== 'string') return { copy: null, reason: '响应不是文本' };
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) return { copy: null, reason: '响应中没有完整JSON' };
  let copy;
  try { copy = JSON.parse(content.slice(start, end + 1)); }
  catch { return { copy: null, reason: 'JSON无法解析' }; }
  const nameReason = validateCardName(copy?.name);
  if (nameReason) return { copy: null, reason: nameReason, rejectedName: copy?.name };
  if (typeof copy.description !== 'string' || !copy.description.trim()) {
    return { copy: null, reason: '描述不能为空', rejectedName: copy.name };
  }
  if (copy.scene != null && typeof copy.scene !== 'string') {
    return { copy: null, reason: 'scene必须是字符串', rejectedName: copy.name };
  }
  return { copy: { name: copy.name.trim(), description: copy.description.trim(), scene: copy.scene?.trim() || null }, reason: null };
}

/** 首次失败时把原结果与原因明确反馈给模型，避免无目的重复采样。 */
export function repairCardCopyPrompt(tasks, parsed) {
  const rejected = parsed.rejectedName ? `原名称：${parsed.rejectedName}。` : '';
  return `今日完成任务：${tasks.join('、')}。上一次输出不合规：${parsed.reason}。${rejected}请纠正后重新输出完整JSON。`;
}

/** 执行最多两次生成；request 只负责按给定用户提示返回模型文本。 */
export async function generateCardCopy(request, tasks) {
  let user = `今日完成任务：${tasks.join('、')}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parsed = parseCardCopy(await request(user));
    if (parsed.copy) return parsed.copy;
    user = repairCardCopyPrompt(tasks, parsed);
  }
  throw new Error('INVALID_UPSTREAM_RESPONSE');
}
