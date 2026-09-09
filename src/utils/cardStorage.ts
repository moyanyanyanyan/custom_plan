import type { CardCollection, InventionCard } from '../types/card';
import { isDemoMode } from './demoMode';

const STORAGE_KEY = 'hackathon-card-collection';
const DEMO_STORAGE_KEY = 'hackathon-card-collection-demo';

function storageKey(): string {
  return isDemoMode() ? DEMO_STORAGE_KEY : STORAGE_KEY;
}

function loadRaw(): CardCollection | null {
  const key = storageKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CardCollection;
  } catch {
    return null;
  }
}

function saveRaw(data: CardCollection) {
  const key = storageKey();
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadCollection(): CardCollection {
  return loadRaw() ?? { cards: [], updatedAt: new Date().toISOString() };
}

export function saveCollection(collection: CardCollection) {
  saveRaw({ ...collection, updatedAt: new Date().toISOString() });
}

export function addCard(card: InventionCard) {
  const collection = loadCollection();
  collection.cards.push(card);
  saveCollection(collection);
  return collection;
}

export function canGenerateToday(): boolean {
  if (isDemoMode()) return true;
  const collection = loadCollection();
  const today = new Date().toISOString().slice(0, 10);
  return !collection.cards.some((c) => c.earnedAt.slice(0, 10) === today);
}

export function getStackedCards(collection: CardCollection, stackKey: string): InventionCard[] {
  return collection.cards.filter((c) => c.stackKey === stackKey);
}

/** 把同款堆叠拆成独立单卡：只改 stackKey，不新增卡牌，总数不变。 */
export function ungroupStack(collection: CardCollection, stackKey: string): CardCollection {
  const cards = collection.cards.map((c, idx) =>
    c.stackKey === stackKey ? { ...c, stackKey: `${c.id}-${idx}` } : c,
  );
  return { ...collection, cards, updatedAt: new Date().toISOString() };
}
