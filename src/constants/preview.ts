import type { Experiment } from '../types/experiment';

export const experiments: Experiment[] = [
  { id: 'lab', name: '打扫实验室', icon: 'flask', minutes: 15, completed: true },
  { id: 'desk', name: '整理桌面', icon: 'grid', minutes: 10, completed: true },
  { id: 'plant', name: '给绿萝浇水', icon: 'drop', minutes: 5, completed: true },
  { id: 'words', name: '背二十个单词', icon: 'book', minutes: 10, completed: true },
  { id: 'read', name: '阅读 20 分钟', icon: 'clock', minutes: 20, completed: true },
];
export const completedCount = experiments.filter((task) => task.completed).length;
