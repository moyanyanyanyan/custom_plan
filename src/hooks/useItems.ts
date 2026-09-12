import { useCallback, useMemo, useState } from 'react';
import type { Experiment } from '../types/experiment';
import type { PixelItem } from '../types/item';
import { ENCHANT_RATES } from '../constants/pixelItems';
import { useAppData } from './useAppData';
import { useCurrentDate } from './useCurrentDate';

const ITEM_NAMES = ['木勺', '石碗', '菜刀', '铁锅', '徽章', '种子袋', '苹果', '指南针', '怀表', '枕头'];
const ENCHANTMENTS = [
  { name: '自动发光', type: 'special' as const, effect: '放在角落里也会努力发出一点光', prefix: '会发光的' },
  { name: '永不磨损', type: 'upgrade' as const, effect: '使用它永远不会让它变旧', prefix: '永不磨损的' },
  { name: '幸运加成', type: 'upgrade' as const, effect: '今天遇到的小麻烦会少一点', prefix: '幸运的' },
  { name: '神秘诅咒', type: 'cursed' as const, effect: '每次使用都会发出一声意味不明的叹息', prefix: '被诅咒的' },
];

function createItem(tasks: Experiment[], dateKey: string, rarity = 'gold'): PixelItem {
  const sourceTask = tasks.filter((task) => task.completed)[0]?.name || tasks[0]?.name || '认真生活';
  const name = ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)];
  const rate = ENCHANT_RATES[rarity] ?? ENCHANT_RATES.gold;
  const enchantmentBase = Math.random() < rate ? ENCHANTMENTS[Math.floor(Math.random() * ENCHANTMENTS.length)] : null;
  const enchantment = enchantmentBase ? { name: enchantmentBase.name, type: enchantmentBase.type, effect: enchantmentBase.effect, sourceTask } : null;
  return {
    id: crypto.randomUUID(), name,
    description: enchantmentBase ? `${enchantmentBase.prefix}${name}` : `平平无奇的${name}`,
    sourceTask, earnedAt: new Date().toISOString(), dailyKey: dateKey, enchantment,
  };
}

export function useItems(tasks: Experiment[]) {
  const { data, update } = useAppData();
  const { dateKey } = useCurrentDate();
  const [forging, setForging] = useState(false);
  const [revealedItem, setRevealedItem] = useState<PixelItem | null>(null);
  const canGenerate = useMemo(() => !data.items.some((item) => item.dailyKey === dateKey), [data.items, dateKey]);
  const forge = useCallback(async (rarity = 'gold') => {
    if (forging || !canGenerate) return null;
    setForging(true);
    try {
      const item = createItem(tasks, dateKey, rarity);
      const saved = await update((current) => ({ ...current, items: [...current.items, item] }));
      const added = saved.items.find((candidate) => candidate.id === item.id) ?? item;
      setRevealedItem(added);
      return added;
    } finally { setForging(false); }
  }, [canGenerate, dateKey, forging, tasks, update]);
  return { items: data.items, dateKey, canGenerate, forging, forge, revealedItem, setRevealedItem };
}
