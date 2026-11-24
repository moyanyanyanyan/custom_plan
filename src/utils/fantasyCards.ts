import type { CardCategory, CardEvidence, CardRelation, CardSuit, FantasyCard, InventionCard, OrdinaryRank, RelationKind } from '../types/card';
import { CARD_SUITS, ORDINARY_RANKS } from '../types/card';

export const SUITS: Record<CardSuit, { symbol: string; name: string; red: boolean }> = {
  clubs: { symbol: '♣', name: '梅花', red: false }, diamonds: { symbol: '♦', name: '方块', red: true },
  hearts: { symbol: '♥', name: '红心', red: true }, spades: { symbol: '♠', name: '黑桃', red: false },
};
export const CATEGORIES: Record<CardCategory, string> = { equipment: '装备', item: '道具', setting: '设定牌' };
export const RELATIONS: Record<RelationKind, { name: string; suit: CardSuit; direction: string; effect: string; action: RegExp }> = {
  friendship_active: { name: '友谊', suit: 'spades', direction: '主动关系', effect: '当你帮助关系对象时，回复10%的黑桃SP。', action: /帮助|帮忙|协助|帮.{0,16}(修|改|做|找|解决|完成)/ },
  love_active: { name: '爱恋', suit: 'hearts', direction: '主动关系', effect: '当你向关系对象表达爱意时，回复10%的红心SP。', action: /表白|表达爱意|说.{0,3}我爱你/ },
  love_passive: { name: '爱恋', suit: 'hearts', direction: '被动关系', effect: '当你被关系对象表达爱意时，回复10%的红心SP。', action: /收到.{0,12}(表白|爱意)|被.{0,12}表白|向我.{0,4}(表白|表达爱意)/ },
  exclusive_active: { name: '独占', suit: 'clubs', direction: '主动关系', effect: '当你向关系对象表达占有时，回复10%的梅花SP。', action: /表达占有|表达独占/ },
  exclusive_passive: { name: '独占', suit: 'diamonds', direction: '被动关系', effect: '当你被关系对象表达占有时，回复10%的方块SP。', action: /被.{0,12}(占有|独占)|向我.{0,4}表达占有/ },
};

export type CardDraft = {
  name: string; description: string; suit: CardSuit; category: CardCategory;
  effect: string; setting: string; scene: string; inspiration: CardEvidence[];
};
export type RelationshipDraft = CardRelation & { description: string; setting: string; scene: string };
export type GeneratedCardCopy = { ordinary: CardDraft; relationship?: unknown };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number, min = 1): value is string => typeof value === 'string' && value.trim().length >= min && Array.from(value).length <= max;
const paragraph = (value: unknown): value is string => text(value, 120) && !/[\r\n]|(?:代价|作用|消耗|发动)\s*[:：]|^[一二三四\d]+[、.)）]/u.test(value);
const sceneText = (value: unknown): value is string => text(value, 400) && /^[\x20-\x7e]+$/.test(value)
  && !/\b(girl|boy|woman|man|person|people|human|hand|hands|face|body|silhouette|character)\b/i.test(value);

/** 点数由程序抽取，注入随机源便于验证概率边界。 */
export function drawRank(random = Math.random): OrdinaryRank {
  const roll = random();
  const pool = roll < .55 ? ORDINARY_RANKS.slice(0, 3) : roll < .85 ? ORDINARY_RANKS.slice(3, 6)
    : roll < .97 ? ORDINARY_RANKS.slice(6, 9) : ['J'] as const;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

function validEvidence(value: unknown, tasks: string[]): value is CardEvidence[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 2 && value.every(item => object(item)
    && Number.isInteger(item.taskIndex) && typeof item.taskIndex === 'number'
    && text(item.quote, 200) && text(item.motif, 20) && item.quote.includes(item.motif)
    && !!tasks[item.taskIndex]?.includes(item.quote));
}

export function parseCardDraft(value: unknown, tasks: string[]): CardDraft | null {
  if (!object(value) || !text(value.name, 8, 2) || !/^[\p{Script=Han}]+$/u.test(value.name)
    || !text(value.description, 40) || !text(value.setting, 60) || !paragraph(value.effect)
    || !sceneText(value.scene) || !CARD_SUITS.includes(value.suit as CardSuit)
    || !['equipment', 'item', 'setting'].includes(String(value.category)) || !validEvidence(value.inspiration, tasks)) return null;
  // 普通牌不能绕过关系扮演恢复已经损失的 SP。
  if (/(恢复|回复|回满|补充)[^。；]{0,16}SP/i.test(value.effect)) return null;
  if (!value.inspiration.some(item => `${value.name}${value.effect}`.includes(item.motif))) return null;
  return { name: value.name, description: value.description, setting: value.setting,
    effect: value.effect, scene: value.scene, suit: value.suit as CardSuit,
    category: value.category as CardCategory,
    inspiration: value.inspiration.map(({ taskIndex, quote, motif }) => ({ taskIndex, quote, motif })) };
}

export function parseRelationship(value: unknown, tasks: string[]): RelationshipDraft | null {
  if (!object(value) || !Object.hasOwn(RELATIONS, String(value.kind)) || !text(value.target, 20)
    || !text(value.quote, 200) || !Number.isInteger(value.taskIndex) || typeof value.taskIndex !== 'number'
    || !text(value.description, 40) || !text(value.setting, 60) || !sceneText(value.scene)) return null;
  const task = tasks[value.taskIndex];
  if (!task?.includes(value.quote) || !value.quote.includes(value.target)
    || /^(自己|我|他|她|它|对方|某人|电脑|任务|工作)$/.test(value.target)
    || /不想|不要|没有|并未|拒绝|未曾|计划|准备|打算/.test(value.quote)) return null;
  const rule = RELATIONS[value.kind as RelationKind];
  if (!rule.action.test(value.quote)) return null;
  // 对象必须直接参与对应行为，不能把同一任务里提到的另一人配成关系。
  const target = value.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const person = `(?:朋友|同事|好友|恋人|我的)?${target}`;
  const evidence: Record<RelationKind, string> = {
    friendship_active: `(?:帮助|协助|帮)(?:了)?${person}|(?:给|为)${person}帮忙`,
    love_active: `(?:向|对)${person}(?:明确)?(?:表白|表达爱意|说我爱你)`,
    love_passive: `收到${person}的?(?:表白|爱意)|被${person}表白|${person}向我(?:表白|表达爱意)`,
    exclusive_active: `(?:向|对)${person}(?:明确)?表达(?:占有|独占)`,
    exclusive_passive: `被${person}(?:表达)?(?:占有|独占)|${person}向我表达(?:占有|独占)`,
  };
  if (!new RegExp(evidence[value.kind as RelationKind]).test(value.quote)) return null;
  // 被动经历不能误判为主动表达；泛泛社交不构成爱恋或独占。
  if (String(value.kind).endsWith('_active') && /被|收到|向我/.test(value.quote)) return null;
  if (!value.setting.includes(value.target)) return null;
  return value as unknown as RelationshipDraft;
}

export function cardStackKey(card: InventionCard): string {
  if (card.version !== 2) return card.stackKey;
  return JSON.stringify([2, card.suit, card.rank, card.category, card.name, card.effect, card.description,
    card.setting, card.relation?.kind ?? null, card.relation?.target ?? null]);
}

export function applyCardCopy(base: FantasyCard, value: unknown, random = Math.random): FantasyCard {
  if (!object(value)) throw new Error('AI_CARD_INVALID');
  const ordinary = parseCardDraft(value.ordinary, base.sourceTasks);
  if (!ordinary) throw new Error('AI_CARD_INVALID');
  let card: FantasyCard = { ...base, ...ordinary };
  const relation = parseRelationship(value.relationship, base.sourceTasks);
  if (relation && random() < .2) {
    const rule = RELATIONS[relation.kind];
    card = { ...card, name: rule.name, suit: rule.suit, rank: 'A', category: 'setting',
      effect: rule.effect.replace('关系对象', relation.target), description: relation.description,
      setting: relation.setting, scene: relation.scene,
      inspiration: [{ taskIndex: relation.taskIndex, quote: relation.quote, motif: relation.target }],
      relation: { kind: relation.kind, target: relation.target, taskIndex: relation.taskIndex, quote: relation.quote } };
  }
  return { ...card, stackKey: cardStackKey(card) };
}

export function isFantasyCard(card: InventionCard): card is FantasyCard {
  return card.version === 2 && CARD_SUITS.includes(card.suit as CardSuit)
    && [...ORDINARY_RANKS, 'A'].includes(String(card.rank)) && Object.hasOwn(CATEGORIES, String(card.category))
    && paragraph(card.effect) && text(card.setting, 60) && sceneText(card.scene)
    && text(card.name, 8, 2) && text(card.description, 40)
    && Array.isArray(card.sourceTasks) && validEvidence(card.inspiration, card.sourceTasks)
    && (card.rank !== 'A' ? !card.relation : (!!card.relation
      && Object.hasOwn(RELATIONS, card.relation.kind) && card.category === 'setting'
      && RELATIONS[card.relation.kind].suit === card.suit
      && !!parseRelationship({ ...card.relation, description: card.description, setting: card.setting, scene: card.scene }, card.sourceTasks)));
}

/** 本地模板也保留真实任务意象；无匹配时用任务原文作为刻印。 */
export function fallbackDraft(tasks: string[]): CardDraft {
  const templates: { pattern: RegExp; motif: string; name: string; suit: CardSuit; category: CardCategory; effect: string; scene: string }[] = [
    { pattern: /读|书|阅读|学习|笔记/, motif: '书', name: '静默书签', suit: 'clubs', category: 'item', effect: '将书签夹入书页并合拢，使范围3内一个目标沉默8秒；再次打开书页或持续时间结束后失效，使用后书签消失。', scene: 'A silver bookmark between closed book pages, broken sound rings, isolated object.' },
    { pattern: /整理|清洁|打扫|收拾|洗/, motif: '整理', name: '归位匣', suit: 'diamonds', category: 'equipment', effect: '整理匣中的物件后，匣盖可展开护盾，抵挡一次正面攻击；护盾持续30秒，破碎后需重新整理才能再次使用。', scene: 'A small orderly storage box with a translucent shield above its lid, isolated object.' },
    { pattern: /饭|餐|菜|休息|睡|水/, motif: '温', name: '余温杯', suit: 'hearts', category: 'item', effect: '饮下杯中的温饮，在30秒内恢复15点MP；每个自然日只凝结一份，温饮离杯1分钟后失效。', scene: 'A white ceramic cup with warm steam shaped into a small luminous heart, isolated object.' },
    { pattern: /运动|跑|锻炼/, motif: '跑', name: '追风鞋', suit: 'spades', category: 'equipment', effect: '连续跑动10秒后，鞋底蓄积的风刃可对前方范围3内一个目标造成黑桃污染；停止跑动即失去蓄能，每次释放消耗2点MP。', scene: 'A single dark running shoe with a silver wind crescent circling its sole, isolated object.' },
    { pattern: /代码|修复|开发|写|项目/, motif: '笔', name: '截稿笔', suit: 'spades', category: 'equipment', effect: '挥笔释放一道墨刃，对范围3内一个目标造成黑桃污染；每次挥动消耗2点MP，笔尖闭合时无法发动。', scene: 'A dark fountain pen with a silver nib and one crescent of ink, isolated object.' },
  ];
  let taskIndex = tasks.findIndex(task => templates.some(t => t.pattern.test(task)));
  if (taskIndex < 0) taskIndex = 0;
  const task = tasks[taskIndex];
  const template = templates.find(t => t.pattern.test(task));
  const motif = task.match(template?.pattern ?? /[\s\S]{1,8}/u)?.[0] ?? task.slice(0, 8);
  const name = template?.name ?? '回响印章';
  const effect = template?.effect ?? `按下刻有「${motif}」的印章，使范围2内一个目标的下一次行动延迟3秒；印记显现后消失，每次使用消耗2点MP。`;
  return { name, suit: template?.suit ?? 'clubs', category: template?.category ?? 'item',
    effect: `${name}${effect}`.includes(motif) ? effect : `凝成「${motif}」印记后，${effect}`,
    description: template ? '它认真执行规则，至于合理性，下次再说。' : '已完成。连命运也得盖章。',
    setting: `你拥有一件由「${motif}」凝成的${name}。`,
    scene: template?.scene ?? 'A small silver seal with abstract blank geometric markings and concentric delayed rings, isolated object.',
    inspiration: [{ taskIndex, quote: task.slice(Math.max(0, task.indexOf(motif)), Math.max(0, task.indexOf(motif)) + 200), motif }] };
}
