import { describe, expect, it } from 'vitest';
import { formatTaskDate, parseTaskInput } from '../../src/utils/taskParser';

const now = new Date(2026, 8, 11, 9);

describe('parseTaskInput', () => {
  it('解析日期、下午时间和提醒', () => {
    const result = parseTaskInput('明天下午三点取快递提醒我', now);
    expect(result).toMatchObject({ title: '取快递', targetDate: '2026-09-12',
      time: '15:00', confidence: 'certain' });
    expect(result.reminderAt).not.toBeNull();
  });

  it('解析工作日重复但不拆成多个任务', () => {
    expect(parseTaskInput('工作日喝八杯水', now)).toMatchObject({
      title: '喝八杯水', repeatRule: 'weekdays',
    });
  });

  it('没有时间的提醒保持待确认', () => {
    expect(parseTaskInput('明天提醒我交报告', now)).toMatchObject({
      title: '交报告', reminderAt: null, confidence: 'partial',
    });
  });

  it('用相对日期和星期显示近期安排', () => {
    expect(formatTaskDate('2026-09-12', '2026-09-11')).toBe('明天');
    expect(formatTaskDate('2026-09-14', '2026-09-11')).toBe('周一');
    expect(formatTaskDate('2026-09-20', '2026-09-11')).toBe('9月20日');
  });
});
