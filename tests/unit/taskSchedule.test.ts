import { describe, expect, it } from 'vitest';
import { nextRepeatDate } from '../../src/utils/taskSchedule';

describe('nextRepeatDate', () => {
  it('计算每日和每周的下一实例', () => {
    expect(nextRepeatDate('2026-09-11', 'daily')).toBe('2026-09-12');
    expect(nextRepeatDate('2026-09-11', 'weekly')).toBe('2026-09-18');
  });

  it('工作日规则跳过周末', () => {
    expect(nextRepeatDate('2026-09-11', 'weekdays')).toBe('2026-09-14');
    expect(nextRepeatDate('2026-09-14', 'weekdays')).toBe('2026-09-15');
  });
});
