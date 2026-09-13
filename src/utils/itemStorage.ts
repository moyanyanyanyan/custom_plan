import type { ItemCollection, PixelItem } from '../types/item';
import { isDemoMode } from './demoMode';

const STORAGE_KEY = 'absurd-pixel-item-collection';
const DEMO_STORAGE_KEY = 'absurd-pixel-item-collection-demo';

function getStorageKey() { return isDemoMode() ? DEMO_STORAGE_KEY : STORAGE_KEY; }

export function loadItemCollection(): ItemCollection {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return { items: [], updatedAt: new Date().toISOString() };
    const parsed = JSON.parse(raw) as Partial<ItemCollection>;
    return { items: Array.isArray(parsed.items) ? parsed.items : [], updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString() };
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

export function saveItemCollection(collection: ItemCollection): ItemCollection {
  const next = { ...collection, updatedAt: new Date().toISOString() };
  localStorage.setItem(getStorageKey(), JSON.stringify(next));
  return next;
}

export function addItem(item: PixelItem): ItemCollection {
  const collection = loadItemCollection();
  return saveItemCollection({ ...collection, items: [...collection.items, item] });
}

export function canGenerateItemToday(items: PixelItem[], dateKey: string): boolean {
  if (isDemoMode()) return true;
  return !items.some((item) => item.dailyKey === dateKey);
}
