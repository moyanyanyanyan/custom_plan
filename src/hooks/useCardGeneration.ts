import { useEffect, useRef, useState } from 'react';
import type { Experiment } from '../types/experiment';
import type { InventionCard, InventionMachineState } from '../types/card';
import { appendBackTasks, generateCardFromTasks, getMachineState, remainingTasksForCard } from '../utils/cardGenerator';
import { generateCardArt, generateCardCopy } from '../utils/aiClient';
import { useCards } from './useCards';

export function useCardGeneration(tasks: Experiment[]) {
  const [inventing, setInventing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [warning, setWarning] = useState('');
  const [revealedCard, setRevealedCard] = useState<InventionCard | null>(null);
  const { cards, claim, updateCard, canGenerate, dateKey } = useCards();
  const generatingRef = useRef(false);
  const remaining = remainingTasksForCard(tasks);
  const alreadyGenerated = !canGenerate();

  /** 生成期间不可交互 */
  const locked = inventing || generatingImage;
  const state: InventionMachineState = locked ? 'generating' : getMachineState(remaining, alreadyGenerated, false);

  // 追写互斥锁：同一批任务在 updateCard 落盘前，防止 effect 被重复触发而重复追加。
  const backSyncRef = useRef(false);

  /**
   * 卡牌生成后，当天新完成的任务自动补进这张卡的背面（方案 A）。
   * 只追写 sourceTasks / backTasks 两个纯数据字段——卡面比例、内部布局、插画、文案一律不动。
   */
  useEffect(() => {
    if (backSyncRef.current) return;
    // 当天已生成的卡（演示模式的 dailyKey 形如 `${dateKey}-test-<ts>`，一并匹配）
    const todayCard = cards.find(
      (card) => card.dailyKey === dateKey || card.dailyKey.startsWith(`${dateKey}-test-`),
    );
    if (!todayCard) return;
    const doneNames = tasks.filter((t) => t.completed).map((t) => t.name);
    const patch = appendBackTasks(todayCard, doneNames);
    if (!patch) return; // 没有新任务：这也是避免 effect 自激的死循环防线
    backSyncRef.current = true;
    updateCard(todayCard.id, patch)
      .catch(() => undefined) // 落盘失败不断界面，下一次任务变化会再试
      .finally(() => { backSyncRef.current = false; });
  }, [cards, dateKey, tasks, updateCard]);

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

      // 先获取 AI 文案（scene 是供文生图使用的英文场景描述，不进入卡面显示字段）
      let card = base;
      let scene: string | undefined;
      try {
        const copy = await generateCardCopy(base.sourceTasks);
        if (copy) {
          const { scene: copyScene, ...text } = copy;
          scene = copyScene ?? undefined;
          card = { ...base, ...text, stackKey: copy.name };
        }
      } catch (reason) {
        setWarning(`AI 文案暂不可用，已采用本地模板：${String(reason)}`);
      }

      // 进入图片生成阶段：禁止交互，显示"图片还在生成中"
      setInventing(false);
      setGeneratingImage(true);
      try {
        const imageAssetId = await generateCardArt({ ...card, scene });
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
