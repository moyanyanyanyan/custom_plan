export const TASK_ICONS = ['flask', 'grid', 'drop', 'book', 'clock'] as const;
export type TaskIcon = (typeof TASK_ICONS)[number];
export type RepeatRule = 'daily' | 'weekly' | 'weekdays';

export interface TaskStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  name: string;
  icon: TaskIcon;
  minutes: number;
  completed: boolean;
  group: string;
  createdAt: string;
  completedAt: string | null;
  scheduledTime: string | null;
  reminderAt: string | null;
  remindedAt: string | null;
  repeatRule: RepeatRule | null;
  seriesId: string | null;
  notes: string;
  steps: TaskStep[];
}

export type TaskSeed = Pick<Task, 'id' | 'name' | 'icon' | 'minutes' | 'completed' | 'group'>
  & Partial<Omit<Task, 'id' | 'name' | 'icon' | 'minutes' | 'completed' | 'group'>>;

export interface TaskDraft {
  title: string;
  targetDate: string;
  time: string | null;
  reminderAt: string | null;
  repeatRule: RepeatRule | null;
  steps: TaskStep[];
}

export interface ScheduledTask { task: Task; dateKey: string }
