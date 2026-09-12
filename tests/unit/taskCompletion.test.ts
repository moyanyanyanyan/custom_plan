import { describe, expect, it } from 'vitest';
import type { Task } from '../../src/types/task';
import { createTask } from '../../src/utils/taskModel';
import { completeTask } from '../../src/utils/taskCompletion';

const task = (id: string, completed = false): Task => createTask({
  id, name: `任务 ${id}`, icon: 'flask', minutes: 10, completed, group: 'A',
  createdAt: '2026-09-11T01:00:00.000Z',
  completedAt: completed ? '2026-09-11T02:00:00.000Z' : null,
});

describe('completeTask', () => {
  it('完成任务后移到末尾并保持其他任务的顺序', () => {
    const result = completeTask([task('1'), task('2'), task('3')], '2',
      '2026-09-11T03:00:00.000Z');
    expect(result.map((entry) => entry.id)).toEqual(['1', '3', '2']);
    expect(result[2]).toMatchObject({ completed: true, completedAt: '2026-09-11T03:00:00.000Z' });
  });

  it('重复完成已完成任务时不改变状态或顺序', () => {
    const tasks = [task('1'), task('2', true)];
    expect(completeTask(tasks, '2', '2026-09-11T04:00:00.000Z')).toBe(tasks);
  });
});
