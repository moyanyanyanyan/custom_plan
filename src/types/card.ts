export type CardTier = 'copper' | 'silver' | 'gold' | 'diamond';

/** 底层材质标签，仅供已有锻造等业务使用。 */
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
  stackKey: string; // 新卡按全部规则文案与关系身份堆叠
  backTasks: string[]; // 历史数据兼容字段；不在牌背展示
  date: string; // 本地日期 YYYY-MM-DD，用于卡外详情显示
  tier: CardTier; // 材质等级
  version?: 2;
  suit?: CardSuit;
  rank?: CardRank;
  category?: CardCategory;
  effect?: string;
  setting?: string;
  scene?: string;
  inspiration?: CardEvidence[];
  relation?: CardRelation;
};

export const CARD_SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type CardSuit = typeof CARD_SUITS[number];
export const ORDINARY_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J'] as const;
export type OrdinaryRank = typeof ORDINARY_RANKS[number];
export type CardRank = OrdinaryRank | 'A';
export type CardCategory = 'equipment' | 'item' | 'setting';
export type RelationKind = 'friendship_active' | 'love_active' | 'love_passive' | 'exclusive_active' | 'exclusive_passive';
export type CardEvidence = { taskIndex: number; quote: string; motif: string };
export type CardRelation = { kind: RelationKind; target: string; taskIndex: number; quote: string };
export type FantasyCard = InventionCard & {
  version: 2; suit: CardSuit; rank: CardRank; category: CardCategory;
  effect: string; setting: string; scene: string; inspiration: CardEvidence[];
};

export type CardCollection = {
  cards: InventionCard[];
  updatedAt: string;
};

export type InventionMachineState = 'locked' | 'ready' | 'generating' | 'completed';
