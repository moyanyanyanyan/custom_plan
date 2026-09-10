import type { ExperimentSeed } from '../types/experiment';

/** 首次启动的默认任务模板（种子）。界面不直接读取，由数据层 tasks.ts 在首次运行时写入本地存储。 */
export const experiments: ExperimentSeed[] = [
  { id: 'lab', name: '打扫实验室', icon: 'flask', minutes: 15, completed: true, group: 'A' },
  { id: 'desk', name: '整理桌面', icon: 'grid', minutes: 10, completed: true, group: 'A' },
  { id: 'plant', name: '给绿萝浇水', icon: 'drop', minutes: 5, completed: false, group: 'A' },
  { id: 'words', name: '背二十个单词', icon: 'book', minutes: 10, completed: false, group: 'A' },
  { id: 'read', name: '阅读 20 分钟', icon: 'clock', minutes: 20, completed: false, group: 'A' },
];
