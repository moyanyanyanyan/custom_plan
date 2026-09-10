import type { InventionCard } from './card';
import type { AppSettings } from './settings';
import type { Slime } from './slime';
import type { Task } from './task';

export interface AppData {
  schemaVersion: 1;
  tasksByDate: Record<string, Task[]>;
  cards: InventionCard[];
  slimes: Slime[];
  settings: AppSettings;
  updatedAt: string;
  storageWarning?: string | null;
}

export interface LegacyData {
  tasksByDate: Record<string, Task[]>;
  cards: InventionCard[];
  demoCards: InventionCard[];
}
