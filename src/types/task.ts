export const TASK_ICONS = ['flask', 'grid', 'drop', 'book', 'clock'] as const;
export type TaskIcon = (typeof TASK_ICONS)[number];

export interface Task {
  id: string;
  name: string;
  icon: TaskIcon;
  minutes: number;
  completed: boolean;
  group: string;
  createdAt: string;
  completedAt: string | null;
}

export type TaskSeed = Omit<Task, 'createdAt' | 'completedAt'>;
