import { useState, useRef } from 'react';
import type { Experiment } from '../types/experiment';
import type { InventionCard, InventionMachineState } from '../types/card';
import { generateCardFromTasks, getMachineState, remainingTasksForCard } from '../utils/cardGenerator';
import { generateCardArt, generateCardCopy } from '../utils/aiClient';
import { useCards } from './useCards';

export function useCardGeneration(tasks: Experiment[]) {
  const [inventing, setInventing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [warning, setWarning] = useState('');
  const [revealedCard, setRevealedCard] = useState<InventionCard | null>(null);
  const { cards, claim, updateCard, canGenerate } = useCards();
  const generatingRef = useRef(false);
  const remaining = remainingTasksForCard(tasks);
  const alreadyGenerated = !canGenerate();

  /** 生成期间不可交互 */
  const locked = inventing || generatingImage;
  const state: InventionMachineState = locked ? 'generating' : getMachineState(remaining, alreadyGenerated, false);

  const generate = async () => {
    if (locked || remaining > 0 || !canGenerate()) return;
    generatingRef.current = true;
    setInventing(true);
    setWarning('');
    // 让 React 先刷新 UI（显示"发明机运转中…"），再开始耗时操作
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const base = generateCardFromTasks(tasks, new Date(), cards);
      if (!base) return;

      // 先获取 AI 文案
      let card = base;
      try {
        const copy = await generateCardCopy(base.sourceTasks);
        if (copy) card = { ...base, ...copy, stackKey: copy.name };
      } catch (reason) {
        setWarning(`AI 文案暂不可用，已采用本地模板：${String(reason)}`);
      }

      // 进入图片生成阶段：禁止交互，显示"图片还在生成中"
      setInventing(false);
      setGeneratingImage(true);
      try {
        const imageAssetId = await generateCardArt(card);
        if (imageAssetId) card = { ...card, imageAssetId };
      } catch (reason) {
        setWarning((current) => current || `AI 插画暂不可用：${String(reason)}`);
      }

      // 图生成完了才加入收藏、显示卡片
      try {
        await claim(card);
      } catch {
        setWarning('今天的卡牌已在另一个窗口生成，请查看收藏册。');
        return;
      }
      await updateCard(card.id, card);
      setRevealedCard(card);
    } finally {
      generatingRef.current = false;
      setGeneratingImage(false);
      setInventing(false);
    }
  };

  return {
    cards, inventing, generatingImage, warning, revealedCard, setRevealedCard,
    remaining, generate, canGenerate, state,
  };
}
