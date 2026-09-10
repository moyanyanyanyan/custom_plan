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
};

export type CardCollection = {
  cards: InventionCard[];
  updatedAt: string;
};
