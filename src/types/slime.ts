export interface Slime {
  id: string;
  sourceTaskId: string;
  sourceTaskName: string;
  name: string;
  description: string;
  discoveredAt: string;
  containedAt: string | null;
}
