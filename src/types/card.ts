export type InventionCard = {
  id: string;
  name: string;
  description: string;
  sourceTasks: string[];
  earnedAt: string; // ISO datetime
  imagePath?: string; // 本地保存路径或占位符
  type: 'daily';
  stackKey: string; // 同类型堆叠用，这里简单用 name 做 key
  backTasks: string[]; // 卡牌背面：当天已完成任务缩写列表
  date: string; // 本地日期 YYYY-MM-DD，用于卡牌显示
};

export type CardCollection = {
  cards: InventionCard[];
  updatedAt: string;
};
