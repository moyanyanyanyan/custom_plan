// AI 文案 + 生图调用层。
// 桌面版：通过 Tauri command 由 Rust 后端代发请求，API key 只存在于后端环境变量，不进前端包。
// 浏览器 / demo 版：直接返回 null，由调用方降级到本地模板卡。

import { isDesktop } from './desktop';
import { invoke } from '@tauri-apps/api/core';

export type AICopy = { name: string; description: string };

interface RustAICopy {
  name: string;
  description: string;
}

/** 生成卡牌文案。失败/非桌面环境时返回 null（调用方降级）。 */
export async function generateAICopy(sourceTasks: string[]): Promise<AICopy | null> {
  if (!isDesktop) return null;
  try {
    const result = await invoke<RustAICopy | null>('generate_ai_copy', { sourceTasks });
    return result ? { name: result.name, description: result.description } : null;
  } catch {
    return null;
  }
}

/** 生成卡牌插画，返回 data:image/png;base64,... 。失败/非桌面环境返回 null。 */
export async function generateArtworkDataURL(prompt: string): Promise<string | null> {
  if (!isDesktop) return null;
  try {
    const b64 = await invoke<string | null>('generate_artwork', { prompt });
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

/** 兼容旧调用：不再暴露 key，始终返回空串 */
export function getStepfunKey(): string {
  return '';
}
