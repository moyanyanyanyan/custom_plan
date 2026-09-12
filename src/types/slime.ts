export interface SlimeMeal {
  taskId: string;
  swallowedAt: string;
}

export interface SlimeTask extends SlimeMeal {
  taskName: string;
  taskDate: string;
  wanderingDays: number;
}

export interface SlimeCompanion {
  meals: SlimeTask[];
  mood: 'light' | 'content' | 'full';
}
