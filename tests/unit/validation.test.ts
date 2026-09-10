import { describe, expect, it } from 'vitest';
import { createDefaultData } from '../../src/constants/defaults';
import { normalizeData } from '../../src/utils/validation';

describe('normalizeData', () => {
  it('过滤损坏任务与卡牌并保留有效记录', () => {
    const fallback = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    const validTask = {
      id: 'task-1', name: '整理桌面', icon: 'grid', minutes: 10,
      completed: false, group: 'A', createdAt: '2026-09-10T00:00:00Z', completedAt: null,
    };
    const normalized = normalizeData({
      schemaVersion: 1, tasksByDate: { '2026-09-10': [validTask, { id: 3 }] },
      cards: [{ id: 2 }], slimes: [], settings: fallback.settings, updatedAt: fallback.updatedAt,
    }, fallback);
    expect(normalized.tasksByDate['2026-09-10']).toEqual([validTask]);
    expect(normalized.cards).toEqual([]);
  });

  it('设置损坏时使用安全默认值', () => {
    const fallback = createDefaultData();
    const normalized = normalizeData({ schemaVersion: 1, settings: null }, fallback);
    expect(normalized.settings).toEqual(fallback.settings);
  });
});
