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
    expect(normalized.tasksByDate['2026-09-10']).toEqual([expect.objectContaining(validTask)]);
    expect(normalized.tasksByDate['2026-09-10'][0]).toMatchObject({
      scheduledTime: null, repeatRule: null, notes: '', steps: [],
    });
    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.cards).toEqual([]);
  });

  it('设置损坏时使用安全默认值', () => {
    const fallback = createDefaultData();
    const normalized = normalizeData({ schemaVersion: 1, settings: null }, fallback);
    expect(normalized.settings).toEqual(fallback.settings);
  });

  it('保留 revision 并为旧卡牌补齐本地日期', () => {
    const fallback = createDefaultData();
    const card = {
      id: 'card-1', name: '旧卡', description: '迁移测试', sourceTasks: [],
      earnedAt: new Date(2026, 8, 10, 12).toISOString(), type: 'daily', stackKey: '旧卡',
    };
    const normalized = normalizeData({
      ...fallback, revision: 7, cards: [card],
    }, fallback);
    expect(normalized.revision).toBe(7);
    expect(normalized.cards[0].dailyKey).toBe('2026-09-10');
  });
});
