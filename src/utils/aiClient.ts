// 卡牌 AI 调用层（文案 + 插画）。
// 桌面版：走 Tauri command，由 Rust 后端直连网关，API key 存在本地设置、不回传前端。
// 浏览器版：走**同域** HTTP 代理（/api/cards/*，由 public/_worker.js 在 Pages 上提供）。
// 不再使用外部代理地址：原先的 *.workers.dev 域名在国内被 DNS 投毒 + SNI 阻断，
// 同域相对路径既绕开该问题，也免去跨域与部署期配置。

import { invoke } from '@tauri-apps/api/core';
import type { GeneratedCopy } from '../types/ai';
import { isDesktop } from './desktop';
import { getDeviceId } from './deviceId';
import { saveBrowserAsset } from './appRepository';

/** Rust 侧 `ai::models::GeneratedItem` 的镜像：道具文案 + 可选的像素图视觉描述。 */
export type GeneratedItemDraft = {
  name: string;
  description: string;
  enchantment?: { name: string; effect: string; kind?: string | null } | null;
  art?: string | null;
};

async function proxy<T>(path: string, body: object): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, deviceId: getDeviceId() }) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.code || `AI_PROXY_${response.status}`);
  return response.json() as Promise<T>;
}

/** 插画 prompt 由 Rust `prompts::card_art` 统一组装（画面内严禁任何文字、锁定角色设计、
 *  并消费文案模型产出的 scene 场景描述）。此处只负责把三个字段传过去，
 *  避免前后端各存一份提示词而产生漂移。 */
export async function generateCardCopy(sourceTasks: string[]): Promise<GeneratedCopy | null> {
  if (isDesktop) {
    // Rust 侧签名是 Result<T, String>：失败会 reject，不会返回 null。
    return invoke<GeneratedCopy>('generate_card_copy', { tasks: sourceTasks });
  }
  return proxy<GeneratedCopy>('/api/cards/copy', { sourceTasks });
}

export async function generateCardArt(card: {
  id: string; name: string; description: string; scene?: string;
}): Promise<string | null> {
  if (isDesktop) {
    const base64 = await invoke<string | null>('generate_card_art', {
      name: card.name,
      description: card.description,
      scene: card.scene ?? null,
    });
    if (!base64) throw new Error('AI 插画返回为空');
    return invoke<string>('save_user_asset', { assetId: card.id, dataUrl: `data:image/png;base64,${base64}` });
  }
  const result = await proxy<{ imageBase64: string; mimeType: string }>('/api/cards/art', {
    name: card.name, description: card.description, scene: card.scene,
  });
  return saveBrowserAsset(card.id, `data:${result.mimeType};base64,${result.imageBase64}`);
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
