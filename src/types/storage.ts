import type { InventionCard } from './card';
import type { AppSettings } from './settings';
import type { Slime } from './slime';
import type { Task } from './task';

export interface AppData {
  schemaVersion: 2;
  revision: number;
  tasksByDate: Record<string, Task[]>;
  cards: InventionCard[];
  slimes: Slime[];
  settings: AppSettings;
  updatedAt: string;
  storageWarning?: string | null;
}

export type SaveStatus = 'saved' | 'pending' | 'failed';

export interface AppDataEvent {
  sourceId: string;
  data: AppData;
}

export interface LegacyData {
  tasksByDate: Record<string, Task[]>;
  cards: InventionCard[];
  demoCards: InventionCard[];
}
