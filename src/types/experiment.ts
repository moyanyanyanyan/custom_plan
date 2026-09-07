export type Experiment = {
  id: string;
  name: string;
  icon: 'flask' | 'grid' | 'drop' | 'book' | 'clock';
  minutes: number;
  completed: boolean;
};
