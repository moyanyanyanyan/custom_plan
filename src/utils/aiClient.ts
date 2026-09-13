import { invoke } from '@tauri-apps/api/core';
import type { GeneratedCopy } from '../types/ai';
import { isDesktop } from './desktop';

/** Rust 侧 `ai::models::GeneratedItem` 的镜像：道具文案 + 可选的像素图视觉描述。 */
export type GeneratedItemDraft = {
  name: string;
  description: string;
  enchantment?: { name: string; effect: string; kind?: string | null } | null;
  art?: string | null;
};

export async function generateCardCopy(sourceTasks: string[]): Promise<GeneratedCopy | null> {
  if (!isDesktop) return null;
  return invoke<GeneratedCopy>('generate_card_copy', { sourceTasks });
}

export async function generateCardArt(card: {
  id: string; name: string; description: string;
}): Promise<string | null> {
  if (!isDesktop) return null;
  return invoke<string>('generate_card_art', {
    cardId: card.id, name: card.name, description: card.description,
  });
}

export async function generateSlimeCopy(taskContext: string): Promise<GeneratedCopy | null> {
  if (!isDesktop) return null;
  return invoke<GeneratedCopy>('generate_slime_copy', { taskContext });
}

/**
 * 道具文案：AI 按「投入的卡牌」生成名称/描述/附魔/像素图视觉描述。
 * 失败（未配置 key、限流、解析失败）一律返回 null，由调用方走前端降级道具池。
 */
export async function generateItemCopy(
  source: { name: string; description: string },
): Promise<GeneratedItemDraft | null> {
  if (!isDesktop) return null;
  try {
    const draft = await invoke<GeneratedItemDraft>('generate_item_copy', {
      cardName: source.name, cardDescription: source.description,
    });
    return draft && typeof draft.name === 'string' && draft.name.trim() ? draft : null;
  } catch { return null; }
}

/**
 * 道具像素图：提示词由 Rust 侧 `prompts::item_art` 统一组装（前端不拼英文提示词），
 * 生成结果落盘为 asset 并返回 asset id；失败返回 null，界面退回首字方块。
 */
export async function generateItemArt(
  item: { id: string; name: string; art: string },
): Promise<string | null> {
  if (!isDesktop || !item.art.trim()) return null;
  try {
    return await invoke<string>('generate_item_art', {
      itemId: item.id, name: item.name, art: item.art,
    });
  } catch { return null; }
}

export async function suggestTaskSteps(title: string): Promise<string[] | null> {
  if (!isDesktop) return null;
  try {
    const result = await invoke<string[]>('suggest_task_steps', { title });
    return result.length >= 2 && result.length <= 6 ? result : null;
  } catch { return null; }
}
