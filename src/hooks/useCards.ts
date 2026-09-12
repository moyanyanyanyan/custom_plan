import { useCallback } from 'react';
import type { InventionCard } from '../types/card';
import { useAppData } from './useAppData';
import { isCardTestMode } from '../utils/demoMode';
import { useCurrentDate } from './useCurrentDate';

export function useCards() {
  const { data, claimDailyCard, updateCard } = useAppData();
  const { dateKey } = useCurrentDate();
  const claim = useCallback((card: InventionCard) => {
    // 测试模式使用唯一日期键，绕过每日限制但保留后端正式保护。
    const claimDate = isCardTestMode() ? `${dateKey}-test-${Date.now()}` : dateKey;
    return claimDailyCard(claimDate, card);
  }, [claimDailyCard, dateKey]);
  const canGenerate = useCallback(() => {
    if (isCardTestMode()) return true;
    return !data.cards.some((card) => card.dailyKey === dateKey);
  }, [data.cards, dateKey]);
  return { cards: data.cards, claim, updateCard, canGenerate, dateKey };
}
