/** 任务图标集合，与 components/Icon.tsx 的图标名保持一致。 */
export const EXPERIMENT_ICONS = ['flask', 'grid', 'drop', 'book', 'clock'] as const;
export type ExperimentIcon = (typeof EXPERIMENT_ICONS)[number];

export type Experiment = {
  id: string;
  name: string;
  icon: ExperimentIcon;
  /** 预计用时（分钟） */
  minutes: number;
  completed: boolean;
  /** 实验组标识，首版固定为 'A'，为“实验组整理”预留 */
  group: string;
  /** 创建时间（ISO 字符串），用于按天归档 */
  createdAt: string;
  /** 完成时间（ISO 字符串），未完成时为 null */
  completedAt: string | null;
};

/** 新建任务所需的字段（不含由数据层生成的时间字段）。 */
export type ExperimentSeed = Omit<Experiment, 'createdAt' | 'completedAt'>;
