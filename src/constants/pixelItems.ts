import type { PixelItem } from '../types/item';

function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function id(): string {
  return crypto.randomUUID();
}

const today = localDateKey();
const yesterday = localDateKey(new Date(Date.now() - 86400000));

/** 预设演示道具数据，覆盖有附魔/无附魔/各类型 */
export const DEMO_ITEMS: PixelItem[] = [
  {
    id: id(), name: '木勺', sourceTask: '吃饭', earnedAt: new Date().toISOString(), dailyKey: today,
    enchantment: null,
    description: '平平无奇的木勺',
  },
  {
    id: id(), name: '石碗', sourceTask: '吃饭', earnedAt: new Date().toISOString(), dailyKey: today,
    enchantment: null,
    description: '平平无奇的石碗',
  },
  {
    id: id(), name: '菜刀', sourceTask: '做饭', earnedAt: new Date().toISOString(), dailyKey: today,
    enchantment: { name: '永不磨损', type: 'upgrade', effect: '这把刀的锋利度永远不会降低', sourceTask: '做饭' },
    description: '一把永不磨损的菜刀',
  },
  {
    id: id(), name: '铁锅', sourceTask: '做饭', earnedAt: new Date().toISOString(), dailyKey: today,
    enchantment: { name: '大胃王', type: 'title', effect: '用这口锅做的食物分量翻倍', sourceTask: '吃饭' },
    description: '一口被大胃王祝福过的铁锅',
  },
  {
    id: id(), name: '徽章', sourceTask: '散步', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '打嗝体质', type: 'cursed', effect: '佩戴者会不停打嗝，但打嗝声可以驱散小动物', sourceTask: '散步' },
    description: '一枚散发着打嗝气息的徽章',
  },
  {
    id: id(), name: '种子袋', sourceTask: '种花', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: null,
    description: '平平无奇的种子袋',
  },
  {
    id: id(), name: '苹果', sourceTask: '吃饭', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '金苹果化', type: 'upgrade', effect: '这颗苹果正在慢慢变成金苹果，吃掉它会有好事发生', sourceTask: '吃饭' },
    description: '一颗正在朝金苹果进化的苹果',
  },
  {
    id: id(), name: '毛笔', sourceTask: '写作', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '灵感迸发', type: 'special', effect: '握住这支笔时，脑海中会自动浮现出下一句该写什么', sourceTask: '写作' },
    description: '一支灵光乍现的毛笔',
  },
  {
    id: id(), name: '指南针', sourceTask: '探索', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: null,
    description: '平平无奇的指南针',
  },
  {
    id: id(), name: '怀表', sourceTask: '等待', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '时间暂缓', type: 'special', effect: '按下表冠，周围的时间会变慢三秒', sourceTask: '等待' },
    description: '一块能让周围时间变慢的怀表',
  },
  {
    id: id(), name: '布丁', sourceTask: '吃甜品', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '弹性MAX', type: 'upgrade', effect: '这布丁摔在地上会弹起来而不是碎掉', sourceTask: '吃甜品' },
    description: '一份弹性十足的布丁',
  },
  {
    id: id(), name: '玻璃杯', sourceTask: '喝水', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: null,
    description: '平平无奇的玻璃杯',
  },
  {
    id: id(), name: '烛台', sourceTask: '看书', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: null,
    description: '平平无奇的烛台',
  },
  {
    id: id(), name: '铲子', sourceTask: '种花', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '自动挖掘', type: 'upgrade', effect: '铲子碰到土就会自己挖起来，根本不需要用力', sourceTask: '种花' },
    description: '一把自动挖土的铲子',
  },
  {
    id: id(), name: '枕头', sourceTask: '睡觉', earnedAt: yesterday, dailyKey: yesterday,
    enchantment: { name: '美梦制造机', type: 'special', effect: '枕着它睡觉一定会做美梦，醒来心情超好', sourceTask: '睡觉' },
    description: '一个能让人做美梦的枕头',
  },
];

/** 附魔概率：按卡牌等级的每日道具生成时判定 */
export const ENCHANT_RATES: Record<string, number> = {
  copper: 0.02,
  silver: 0.05,
  gold: 0.10,
  diamond: 0.20,
};