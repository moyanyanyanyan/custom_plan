import { describe, expect, it } from 'vitest';
import { elapsedDays, localDateKey } from '../../src/utils/date';

describe('date utilities', () => {
  it('使用本地日期分桶', () => {
    expect(localDateKey(new Date(2026, 8, 10, 23, 59))).toBe('2026-09-10');
  });

  it('按自然日计算游荡天数', () => {
    expect(elapsedDays('2026-09-08T23:50:00.000Z', new Date(2026, 8, 10))).toBe(2);
  });
});
