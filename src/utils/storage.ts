/** 本地存储安全封装：统一键前缀、JSON 容错；读写失败时静默降级，不阻断界面。 */

const PREFIX = 'absurd.';

/** 键是否存在（用于区分“未初始化”与“已清空”）。 */
export function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null;
  } catch {
    return false;
  }
}

/** 读取并解析 JSON；缺失或损坏时返回 fallback。 */
export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 写入 JSON；失败时静默忽略（如存储被禁用）。 */
export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 存储不可用时保持内存状态
  }
}

/** 删除指定键。 */
export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // 忽略删除失败
  }
}

/** 枚举带前缀的所有键名（不含前缀部分），用于历史归档遍历。 */
export function keysWithPrefix(prefix = 'tasks.'): string[] {
  const full = PREFIX + prefix;
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(full)) keys.push(key.slice(full.length));
    }
  } catch {
    // 忽略枚举失败
  }
  return keys;
}
