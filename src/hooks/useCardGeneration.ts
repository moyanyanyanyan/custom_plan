import { useState } from 'react';
import type { Experiment } from '../types/experiment';
import type { InventionCard } from '../types/card';
import type { InventionMachineState } from '../types/card';
import { generateCardFromTasks, getMachineState, remainingTasksForCard } from '../utils/cardGenerator';
import { generateCardArt, generateCardCopy } from '../utils/aiClient';
import { useCards } from './useCards';

export function useCardGeneration(tasks: Experiment[]) {
  const [inventing, setInventing] = useState(false);
  const [warning, setWarning] = useState('');
  const [revealedCard, setRevealedCard] = useState<InventionCard | null>(null);
  const { cards, claim, updateCard, canGenerate } = useCards();
  const remaining = remainingTasksForCard(tasks);
  const alreadyGenerated = !canGenerate();
  const state: InventionMachineState = getMachineState(remaining, alreadyGenerated, inventing);

  const generate = async () => {
    if (inventing || remaining > 0 || !canGenerate()) return;
    setInventing(true);
    setWarning('');
    console.info('[invention] start');
    try {
      const base = generateCardFromTasks(tasks);
      if (!base) { console.warn('[invention] no card'); return; }
      console.info('[invention] base card created', base.id);
      let card = base;
      try {
        console.info('[invention] generating copy');
        const copy = await generateCardCopy(base.sourceTasks);
        if (copy) card = { ...base, ...copy, stackKey: copy.name };
      } catch (reason) {
        setWarning(`AI 文案暂不可用，已采用本地模板：${String(reason)}`);
      }
      try {
        console.info('[invention] claiming card');
        await claim(card);
      } catch {
        setWarning('今天的卡牌已在另一个窗口生成，请查看收藏册。');
        return;
      }
      console.info('[invention] opening reveal', card.id);
      setRevealedCard(card);
      void generateCardArt(card).then(async (imageAssetId) => {
        if (!imageAssetId) return;
        const withArt = { ...card, imageAssetId };
        console.info('[invention] updating art', card.id);
        await updateCard(card.id, withArt);
        setRevealedCard((current) => current?.id === card.id ? withArt : current);
      }).catch((reason) => {
        console.warn('[invention] art unavailable', reason);
      });
    } finally {
      console.info('[invention] finished');
      setInventing(false);
    }
  };

  return {
    cards, inventing, warning, revealedCard, setRevealedCard,
    remaining, generate, canGenerate, state,
  };
}
