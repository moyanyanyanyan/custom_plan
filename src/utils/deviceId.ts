import { loadJson, saveJson } from './storage';

const STORAGE_KEY = 'device-id';

export function getDeviceId(): string {
  const existing = loadJson<string>(STORAGE_KEY, '');
  if (existing && /^[a-zA-Z0-9_-]{16,128}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  saveJson(STORAGE_KEY, created);
  return created;
}
