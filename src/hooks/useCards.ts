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
    if (isDemoMode()) return true;
    return !data.cards.some((card) => card.dailyKey === dateKey);
  }, [data.cards, dateKey]);
  return { cards: data.cards, claim, updateCard, canGenerate, dateKey };
}
