import { invoke } from '@tauri-apps/api/core';
import type { GeneratedCopy } from '../types/ai';
import { isDesktop } from './desktop';
import { getDeviceId } from './deviceId';

const proxyUrl = (import.meta.env.VITE_AI_PROXY_URL as string | undefined)?.replace(/\/$/, '');

async function proxy<T>(path: string, body: object): Promise<T> {
  if (!proxyUrl) throw new Error('AI_PROXY_NOT_CONFIGURED');
  const response = await fetch(`${proxyUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, deviceId: getDeviceId() }) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.code || `AI_PROXY_${response.status}`);
  return response.json() as Promise<T>;
}

export async function generateCardCopy(sourceTasks: string[]): Promise<GeneratedCopy | null> {
  return proxy<GeneratedCopy>('/api/cards/copy', { sourceTasks });
}

export async function generateCardArt(card: {
  id: string; name: string; description: string;
}): Promise<string | null> {
  const result = await proxy<{ imageBase64: string; mimeType: string }>('/api/cards/art', { name: card.name, description: card.description });
  if (!isDesktop) return null;
  return invoke<string>('save_user_asset', { assetId: card.id, dataUrl: `data:${result.mimeType};base64,${result.imageBase64}` });
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
