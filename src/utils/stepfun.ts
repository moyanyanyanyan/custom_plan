// AI 文案 + 生图调用层。
// 桌面版：通过 Tauri command 由 Rust 后端代发请求，API key 优先走本地设置，不回传给前端。
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
    const result = await invoke<RustAICopy | null>('generate_card_copy', { tasks: sourceTasks });
    return result ? { name: result.name, description: result.description } : null;
  } catch {
    return null;
  }
}

// 注：旧版 generateArtworkDataURL（返回 dataURL 给 canvas 处理）已随 cardImage.ts 一起删除。
// 现在插画统一走 aiClient.generateCardArt → 原生命令 generate_card_art → save_user_asset，
// 由 Rust 侧 prompts::card_art 组装提示词（含 AI 生成的 scene 场景描述）。

/** 持久化 StepFun key 到本地设置；非桌面环境直接返回。 */
export async function saveStepfunKey(key: string): Promise<void> {
  if (!isDesktop) return;
  await invoke('save_stepfun_api_key', { key });
}

/** 读取本地保存的 StepFun key；前端始终拿不到真实 key 的可见回显，只用于回填输入框。 */
export function getStepfunKey(): string {
  try {
    return localStorage.getItem('stepfun_api_key') || '';
  } catch {
    return '';
  }
}
