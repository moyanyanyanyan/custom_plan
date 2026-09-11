import { describe, expect, it } from 'vitest';
import { sortTasks } from '../../src/utils/taskSort';
import type { Task } from '../../src/types/task';

const task = (id: string, completed: boolean, scheduledTime: string | null): Task => ({
  id, name: id, icon: 'flask', minutes: 10, completed, group: 'A', createdAt: '',
  completedAt: null, scheduledTime, reminderAt: null, remindedAt: null, repeatRule: null,
  seriesId: null, notes: '', steps: [],
});

describe('sortTasks', () => {
  it('未完成优先并按时间排序，无时间稳定置后', () => {
    const result = sortTasks([task('done', true, '08:00'), task('late', false, '18:00'),
      task('none', false, null), task('early', false, '09:00')]);
    expect(result.map((item) => item.id)).toEqual(['early', 'late', 'none', 'done']);
  });

  it('相同状态和时间保持原顺序', () => {
    const result = sortTasks([task('a', false, '09:00'), task('b', false, '09:00')]);
    expect(result.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
