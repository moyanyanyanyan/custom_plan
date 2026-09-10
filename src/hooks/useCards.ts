import { useCallback } from 'react';
import type { InventionCard } from '../types/card';
import { useAppData } from './useAppData';
import { localDateKey } from '../utils/date';
import { isDemoMode } from '../utils/demoMode';

export function useCards() {
  const { data, update } = useAppData();
  const add = useCallback((card: InventionCard) => {
    update((current) => ({ ...current, cards: [...current.cards, card] }));
  }, [update]);
  const canGenerate = useCallback((date = new Date()) => {
    if (isDemoMode()) return true;
    const today = localDateKey(date);
    return !data.cards.some((card) => localDateKey(new Date(card.earnedAt)) === today);
  }, [data.cards]);
  return { cards: data.cards, add, canGenerate };
}
