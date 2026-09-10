import { createContext, useContext } from 'react';
import type { AppData } from '../types/storage';
import type { InventionCard } from '../types/card';
import type { SaveStatus } from '../types/storage';

export interface AppDataContextValue {
  data: AppData;
  ready: boolean;
  error: string;
  saveStatus: SaveStatus;
  update: (recipe: (current: AppData) => AppData) => Promise<AppData>;
  claimDailyCard: (dateKey: string, card: InventionCard) => Promise<AppData>;
  updateCard: (cardId: string, patch: Partial<InventionCard>) => Promise<AppData>;
  retrySave: () => Promise<void>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData 必须在 AppDataProvider 内使用');
  return context;
}
