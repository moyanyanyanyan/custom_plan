export type InventionCard = {
  id: string;
  name: string;
  description: string;
  sourceTasks: string[];
  earnedAt: string; // ISO datetime
  imagePath?: string; // 本地保存路径或占位符
  type: 'daily';
  stackKey: string; // 同类型堆叠用，这里简单用 name 做 key
};

export type CardCollection = {
  cards: InventionCard[];
  updatedAt: string;
};
