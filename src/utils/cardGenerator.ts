import type { InventionCard } from '../types/card';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateCardFromTasks(tasks: { name: string; completed: boolean }[]): InventionCard | null {
  const completedTasks = tasks.filter((t) => t.completed).map((t) => t.name);
  if (completedTasks.length < 1) return null;

  const name = `#${Math.floor(Math.random() * 9000 + 1000)} 无用功粒子`;
  const descriptions = [
    '把今天的微小行动，编译成一场荒诞实验。',
    '当“认真生活”被投入反应釜，会冒泡出一种不可思议的副产品。',
    '来自日常杂物的随机坍缩产物。',
    '记录了今日至少一项任务完成的奇点。',
  ];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  return {
    id: generateId(),
    name,
    description,
    sourceTasks: completedTasks,
    earnedAt: new Date().toISOString(),
    type: 'daily',
    stackKey: name,
  };
}
