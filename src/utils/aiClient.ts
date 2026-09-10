import { invoke } from '@tauri-apps/api/core';
import type { GeneratedCopy } from '../types/ai';
import { isDesktop } from './desktop';

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
