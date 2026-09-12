import { useCallback } from 'react';
import type { InventionCard } from '../types/card';
import { useAppData } from './useAppData';
import { isDemoMode } from '../utils/demoMode';
import { useCurrentDate } from './useCurrentDate';

export function useCards() {
  const { data, claimDailyCard, updateCard } = useAppData();
  const { dateKey } = useCurrentDate();
  const claim = useCallback((card: InventionCard) => claimDailyCard(dateKey, card),
    [claimDailyCard, dateKey]);
  const canGenerate = useCallback(() => {
    // 桌面端开发构建用于重复测试完整生成流程，正式构建仍保留每日限制。
    if (isDemoMode() || import.meta.env.DEV) return true;
    return !data.cards.some((card) => card.dailyKey === dateKey);
  }, [data.cards, dateKey]);
  return { cards: data.cards, claim, updateCard, canGenerate, dateKey };
}
