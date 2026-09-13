import type { Experiment } from '../types/experiment';
import type { CardTier, InventionCard } from '../types/card';
import { DAILY_CARD_THRESHOLD } from '../constants/generation';
import { localDateKey } from './date';
import type { InventionMachineState } from '../types/card';

/** 计算连续活跃天数（从现有卡片的 dailyKey 推算） */
export function calcStreak(existingCards: { dailyKey: string }[]): number {
  if (!existingCards.length) return 0;
  const keys = [...new Set(existingCards.map(c => c.dailyKey))].sort().reverse();
  let streak = 0;
  const today = new Date();
  const todayStr = localDateKey(today);
  // 从今天或最近一张卡开始往前数
  let check = keys[0];
  // 如果最近一天不是今天，从最近一天开始数
  while (true) {
    const [y, m, d] = check.split('-').map(Number);
    const checkDate = new Date(y, m - 1, d);
    const prevDate = new Date(checkDate.getTime() - 86400000);
    const prevKey = localDateKey(prevDate);
    streak++;
    if (!keys.includes(prevKey)) break;
    check = prevKey;
  }
  return streak;
}

/** 根据连续天数返回材质等级 */
export function getTier(streak: number): CardTier {
  if (streak >= 30) return 'diamond';
  if (streak >= 9) return 'gold';
  if (streak >= 4) return 'silver';
  return 'copper';
}

/** 称号池：根据任务数量/类型合出更有文采的卡牌标题 */
const TITLE_POOLS: { match: string[]; titles: { title: string; desc: string }[] }[] = [
  {
    match: ['学', '书', '读', '单词', '背', '课', '习', '考', '试'],
    titles: [
      { title: '学识达人', desc: '在知识的海洋里又航行了一天。' },
      { title: '学习小能手', desc: '今日份大脑升级已完成。' },
      { title: '书中自有', desc: '翻过的一页页，都是通向未来的阶梯。' },
      { title: '求知者', desc: '好奇心驱动的探索者，从不停止发问。' },
      { title: '自习王者', desc: '没有人监督的时候，你成了自己的老师。' },
    ],
  },
  {
    match: ['打扫', '整理', '清', '洗', '擦', '扫', '拖'],
    titles: [
      { title: '清洁大师', desc: '每一寸整洁都来自你的双手。' },
      { title: '整理之王', desc: '混乱退散，秩序降临。' },
      { title: '居家达人', desc: '用劳动把生活空间变成理想模样。' },
      { title: '空间魔术师', desc: '把杂乱的角落变成井井有条的艺术品。' },
    ],
  },
  {
    match: ['运动', '跑步', '健身', '练', '瑜伽', '走', '跑', '跳'],
    titles: [
      { title: '运动之星', desc: '汗水是最诚实的勋章。' },
      { title: '活力全开', desc: '身体动起来，大脑也清醒了。' },
      { title: '坚持达人', desc: '今天的你，比昨天更强了一点。' },
    ],
  },
  {
    match: ['代码', '写', 'bug', '程序', '开发', '编程', '项目'],
    titles: [
      { title: '代码匠人', desc: '一行行代码搭建出数字王国的砖瓦。' },
      { title: '逻辑大师', desc: '把复杂问题拆解成优雅的解决方案。' },
      { title: '实验之王', desc: '今天的实验不只是在实验室，也在代码里。' },
      { title: 'Bug 猎人', desc: '没有 bug 能逃过你的眼睛。' },
    ],
  },
  {
    match: ['画', '设计', '图', '创作', '艺术', '音乐'],
    titles: [
      { title: '创意大师', desc: '灵感不是等来的，是你动手创造出来的。' },
      { title: '艺术先锋', desc: '每一笔都是内心世界的投射。' },
      { title: '造梦者', desc: '把想象变成看得见摸得着的东西。' },
    ],
  },
  {
    match: ['做菜', '做饭', '煮', '炒', '烘焙', '料理'],
    titles: [
      { title: '厨艺达人', desc: '用食物的温度温暖了这一天。' },
      { title: '美食家', desc: '不只吃得好，也做得棒。' },
      { title: '厨房魔法师', desc: '普通的食材在你手里变成美味佳肴。' },
    ],
  },
  {
    match: ['写', '文章', '日记', '笔记', '记录', '博客'],
    titles: [
      { title: '书写者', desc: '文字是你思想的脚印。' },
      { title: '记录达人', desc: '今天的思考，明天的财富。' },
      { title: '笔下生花', desc: '每一个字都是对生活的认真。' },
    ],
  },
  {
    match: ['开会', '会议', '沟通', '交流', '汇报'],
    titles: [
      { title: '沟通达人', desc: '信息的桥梁，团队的纽带。' },
      { title: '协作之星', desc: '一个人的力量有限，一群人能走得更远。' },
    ],
  },
  {
    match: ['睡', '休息', '冥想', '放松'],
    titles: [
      { title: '充电完成', desc: '好好休息是为了更好地出发。' },
      { title: '平衡大师', desc: '懂得休息的人，才懂得全力以赴。' },
    ],
  },
  {
    match: ['绿萝', '花', '植物', '浇水', '花园'],
    titles: [
      { title: '植物守护者', desc: '绿色的生命在你手中静静生长。' },
      { title: '自然之友', desc: '与植物相伴的每一天，都是治愈的时光。' },
    ],
  },
];

function hashStr(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function summarizeTasks(tasks: string[]): { title: string; description: string } {
  if (!tasks.length) return { title: '无用功粒子', description: '把今天的微小行动，编译成一场荒诞实验。' };

  const allText = tasks.join(' ');
  // 按匹配权重排序：命中越多种关键词的池优先
  const scored = TITLE_POOLS.map((pool) => {
    const score = pool.match.filter((kw) => allText.includes(kw)).length;
    return { pool, score };
  }).sort((a, b) => b.score - a.score);

  // 选匹配度最高的池（至少命中 1 个关键词）
  const best = scored.find((s) => s.score > 0);
  if (best) {
    const idx = hashStr(allText) % best.pool.titles.length;
    const picked = best.pool.titles[idx];
    return { title: picked.title, description: picked.desc };
  }

  // 无匹配时的通用标题
  const genericTitles = [
    { title: '日行一事', description: '每一天的坚持，都是通向更好的自己。' },
    { title: '今日完满', description: '完成了今天的任务，给认真的自己点个赞。' },
    { title: '生活艺术家', description: '把平凡的日子过成诗。' },
    { title: '持之以恒', description: '今天的努力，是明天的底气。' },
    { title: '行动派', description: '想做的事，今天就做了。' },
    { title: '小小成就', description: '再小的进步，也是向前的一步。' },
  ];
  const idx = hashStr(allText) % genericTitles.length;
  return { title: genericTitles[idx].title, description: genericTitles[idx].description };
}

function generateId() {
  return crypto.randomUUID();
}

/** 剩余所需任务数（>0 = 还没到门槛）。 */
export function remainingTasksForCard(tasks: { completed: boolean }[]): number {
  const done = tasks.filter((t) => t.completed).length;
  return Math.max(0, DAILY_CARD_THRESHOLD - done);
}

export function getMachineState(
  remaining: number, generated: boolean, inventing: boolean,
): InventionMachineState {
  if (inventing) return 'generating';
  if (generated) return 'completed';
  return remaining > 0 ? 'locked' : 'ready';
}

/**
 * 门槛检查：完成数不足 5 时返回 null（调用方据 remainingTasksForCard 提示差额）。
 * 注意：这里只负责"卡牌结构"（来源/时间由程序填），名称与描述由 AI 文案模块异步生成，
 * 失败时由 aiCopy 层降级到本地模板，因此本函数只返回结构占位所需的完成列表。
 */
export function generateCardFromTasks(
  tasks: Experiment[],
  date = new Date(),
  /** 已有卡牌历史。材质等级由连续研究天数决定，不传就只能算成第 1 天。 */
  existingCards: { dailyKey: string }[] = [],
): InventionCard | null {
  const completedTasks = tasks.filter((t) => t.completed).map((t) => t.name);
  if (completedTasks.length < DAILY_CARD_THRESHOLD) return null;

  // 这张卡就是今天的：先把它并入日常序列再数连续天数，否则永远少算今天这一天。
  const streak = calcStreak([...existingCards, { dailyKey: localDateKey(date) }]);

  // 本地降级命名：基于任务文本摘要出“当天总结/鼓励”式卡名与说明
  const summary = summarizeTasks(completedTasks);
  const name = summary.title || '无用功粒子';
  const description = summary.description || '把今天的微小行动，编译成一场荒诞实验。';

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  return {
    id: generateId(),
    name,
    description,
    sourceTasks: completedTasks,
    earnedAt: date.toISOString(),
    dailyKey: localDateKey(date),
    imagePath: undefined,
    type: 'daily',
    stackKey: name,
    backTasks: completedTasks.map((t) => t.slice(0, 10)),
    date: dateStr,
    tier: getTier(streak),
  };
}
