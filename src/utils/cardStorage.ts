import type { CardCollection, InventionCard } from '../types/card';

const STORAGE_KEY = 'hackathon-card-collection';

function loadRaw(): CardCollection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CardCollection;
  } catch {
    return null;
  }
}

function saveRaw(data: CardCollection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  const collection = loadCollection();
  const today = new Date().toISOString().slice(0, 10);
  return !collection.cards.some((c) => c.earnedAt.slice(0, 10) === today);
}

export function getStackedCards(collection: CardCollection, stackKey: string): InventionCard[] {
  return collection.cards.filter((c) => c.stackKey === stackKey);
}

export function splitCard(collection: CardCollection, stackKey: string): CardCollection | null {
  const stacked = getStackedCards(collection, stackKey);
  if (stacked.length <= 1) return null; // 只有一张，无法分化
  const source = stacked[0];
  const newCard: InventionCard = {
    ...source,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    earnedAt: new Date().toISOString(),
  };
  return {
    cards: [...collection.cards, newCard],
    updatedAt: new Date().toISOString(),
  };
}
