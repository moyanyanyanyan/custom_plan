import { useCallback, useMemo, useState } from 'react';
import type { Enchantment, EnchantmentType, PixelItem } from '../types/item';
import { ENCHANT_RATES } from '../constants/pixelItems';
import { generateItemArt, generateItemCopy } from '../utils/aiClient';
import { useAppData } from './useAppData';
import { useCurrentDate } from './useCurrentDate';

/** 降级道具池：AI 不可用时才使用，保证锻造永远不空手。 */
const ITEM_NAMES = ['木勺', '石碗', '菜刀', '铁锅', '徽章', '种子袋', '苹果', '指南针', '怀表', '枕头'];
const ENCHANTMENTS = [
  { name: '自动发光', type: 'special' as const, effect: '放在角落里也会努力发出一点光', prefix: '会发光的' },
  { name: '永不磨损', type: 'upgrade' as const, effect: '使用它永远不会让它变旧', prefix: '永不磨损的' },
  { name: '幸运加成', type: 'upgrade' as const, effect: '今天遇到的小麻烦会少一点', prefix: '幸运的' },
  { name: '神秘诅咒', type: 'cursed' as const, effect: '每次使用都会发出一声意味不明的叹息', prefix: '被诅咒的' },
];
const ENCHANT_TYPES: EnchantmentType[] = ['title', 'upgrade', 'cursed', 'special'];

/** 投入锻造炉的卡牌（只取锻造需要的字段，InventionCard 可直接传入）。 */
export type ForgeSource = { id: string; name: string; description: string };
export type ForgeStage = 'idle' | 'reading' | 'drawing';

function pick<T>(list: T[]): T { return list[Math.floor(Math.random() * list.length)]; }

function aiEnchantment(draft: { name: string; effect: string; kind?: string | null }, sourceTask: string): Enchantment | null {
  const name = draft.name.trim();
  if (!name) return null;
  const kind = (draft.kind ?? '').trim().toLowerCase();
  const type = (ENCHANT_TYPES as string[]).includes(kind) ? kind as EnchantmentType : 'special';
  return { name, type, effect: draft.effect.trim() || '效果不明', sourceTask };
}

/** 降级：不调 AI，用公版道具池拼一件，来源仍记为这张卡牌。 */
function degradedItem(id: string, source: ForgeSource | null, dateKey: string, rarity: string): PixelItem {
  const sourceTask = source?.name ?? '认真生活';
  const name = pick(ITEM_NAMES);
  const rate = ENCHANT_RATES[rarity] ?? ENCHANT_RATES.gold;
  const base = Math.random() < rate ? pick(ENCHANTMENTS) : null;
  return {
    id, name,
    description: base ? `${base.prefix}${name}` : `平平无奇的${name}`,
    sourceTask, earnedAt: new Date().toISOString(), dailyKey: dateKey,
    enchantment: base ? { name: base.name, type: base.type, effect: base.effect, sourceTask } : null,
    imageAssetId: null,
    sourceCardId: source?.id ?? null, sourceCardName: source?.name ?? null,
    degraded: true,
  };
}

export function useItems() {
  const { data, update } = useAppData();
  const { dateKey } = useCurrentDate();
  const [forging, setForging] = useState(false);
  const [stage, setStage] = useState<ForgeStage>('idle');
  const [revealedItem, setRevealedItem] = useState<PixelItem | null>(null);
  const canGenerate = useMemo(() => !data.items.some((item) => item.dailyKey === dateKey), [data.items, dateKey]);

  /** 选一张卡牌 → AI 生成文案 → AI 生成像素图 → 入册。任一步 AI 失败都不阻断锻造。 */
  const forge = useCallback(async (source: ForgeSource | null = null, rarity = 'gold') => {
    if (forging || !canGenerate) return null;
    setForging(true);
    setStage('reading');
    const id = crypto.randomUUID();
    try {
      const draft = await generateItemCopy(source ?? { name: '今天的任务', description: '今天认真完成的事' });
      let item: PixelItem;
      if (!draft) {
        item = degradedItem(id, source, dateKey, rarity);
      } else {
        const sourceTask = source?.name ?? '认真生活';
        const rate = ENCHANT_RATES[rarity] ?? ENCHANT_RATES.gold;
        const enchantment = Math.random() < rate
          ? (draft.enchantment ? aiEnchantment(draft.enchantment, sourceTask)
            : (() => { const base = pick(ENCHANTMENTS); return { name: base.name, type: base.type, effect: base.effect, sourceTask }; })())
          : null;
        item = {
          id, name: draft.name, description: draft.description,
          sourceTask, earnedAt: new Date().toISOString(), dailyKey: dateKey,
          enchantment, imageAssetId: null,
          sourceCardId: source?.id ?? null, sourceCardName: source?.name ?? null,
          degraded: false,
        };
        setStage('drawing');
        item.imageAssetId = await generateItemArt({ id, name: draft.name, art: draft.art ?? '' });
      }
      const saved = await update((current) => ({ ...current, items: [...current.items, item] }));
      const added = saved.items.find((candidate) => candidate.id === item.id) ?? item;
      setRevealedItem(added);
      return added;
    } finally {
      setForging(false);
      setStage('idle');
    }
  }, [canGenerate, dateKey, forging, update]);

  return { items: data.items, cards: data.cards, dateKey, canGenerate, forging, stage, forge, revealedItem, setRevealedItem };
}
