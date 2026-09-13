// 卡牌 AI 调用层（文案 + 插画）。
// 桌面版：走 Tauri command，由 Rust 后端直连网关，API key 存在本地设置、不回传前端。
// 浏览器版：走 HTTP 代理（需要 VITE_AI_PROXY_URL，由部署方提供）。

import { invoke } from '@tauri-apps/api/core';
import type { GeneratedCopy } from '../types/ai';
import { isDesktop } from './desktop';
import { getDeviceId } from './deviceId';
import { saveBrowserAsset } from './appRepository';

const proxyUrl = (import.meta.env.VITE_AI_PROXY_URL as string | undefined)?.replace(/\/$/, '');

async function proxy<T>(path: string, body: object): Promise<T> {
  if (!proxyUrl) throw new Error('AI_PROXY_NOT_CONFIGURED');
  const response = await fetch(`${proxyUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, deviceId: getDeviceId() }) });
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

export async function suggestTaskSteps(title: string): Promise<string[] | null> {
  if (!isDesktop) return null;
  try {
    const result = await invoke<string[]>('suggest_task_steps', { title });
    return result.length >= 2 && result.length <= 6 ? result : null;
  } catch { return null; }
}
