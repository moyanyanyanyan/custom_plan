export type CardTier = 'copper' | 'silver' | 'gold' | 'diamond';

/** 材质等级的展示标签（卡面右上角徽章用）。 */
export const TIER_LABELS: Record<CardTier, string> = {
  copper: '铜', silver: '银', gold: '金', diamond: '钻',
};

export const CARD_TIERS: readonly CardTier[] = ['copper', 'silver', 'gold', 'diamond'];

export type InventionCard = {
  id: string;
  name: string;
  description: string;
  sourceTasks: string[];
  earnedAt: string; // ISO datetime
  dailyKey: string;
  imageAssetId?: string;
  imagePath?: string;
  type: 'daily';
  stackKey: string; // 同类型堆叠用，这里简单用 name 做 key
  backTasks: string[]; // 卡牌背面：当天已完成任务缩写列表
  date: string; // 本地日期 YYYY-MM-DD，用于卡牌显示
  tier: CardTier; // 材质等级
};

export type CardCollection = {
  cards: InventionCard[];
  updatedAt: string;
};

export type InventionMachineState = 'locked' | 'ready' | 'generating' | 'completed';
