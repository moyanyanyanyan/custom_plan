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
    try {
      const base = generateCardFromTasks(tasks);
      if (!base) return;
      try {
        await claim(base);
      } catch {
        setWarning('今天的卡牌已在另一个窗口生成，请查看收藏册。');
        return;
      }
      let card = base;
      try {
        const copy = await generateCardCopy(base.sourceTasks);
        if (copy) card = { ...base, ...copy, stackKey: copy.name };
      } catch (reason) {
        setWarning(`AI 文案暂不可用，已采用本地模板：${String(reason)}`);
      }
      try {
        const imageAssetId = await generateCardArt(card);
        if (imageAssetId) card = { ...card, imageAssetId };
      } catch (reason) {
        setWarning((current) => current || `AI 插画暂不可用：${String(reason)}`);
      }
      await updateCard(card.id, card);
      setRevealedCard(card);
    } finally {
      setInventing(false);
    }
  };

  return {
    cards, inventing, warning, revealedCard, setRevealedCard,
    remaining, generate, canGenerate, state,
  };
}
