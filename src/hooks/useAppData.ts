import { createContext, useContext } from 'react';
import type { AppData } from '../types/storage';

export interface AppDataContextValue {
  data: AppData;
  ready: boolean;
  error: string;
  update: (recipe: (current: AppData) => AppData) => void;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData 必须在 AppDataProvider 内使用');
  return context;
}
