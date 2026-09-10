import { describe, expect, it } from 'vitest';
import { generateCardFromTasks, remainingTasksForCard } from '../../src/utils/cardGenerator';
import type { Task } from '../../src/types/task';

function task(index: number, completed = true): Task {
  return {
    id: `task-${index}`, name: `任务 ${index}`, icon: 'flask', minutes: 10,
    completed, group: 'A', createdAt: '2026-09-10T00:00:00.000Z',
    completedAt: completed ? '2026-09-10T01:00:00.000Z' : null,
  };
}

describe('cardGenerator', () => {
  it('完成五项后按注入时间生成卡牌', () => {
    const date = new Date('2026-09-10T12:00:00.000Z');
    const card = generateCardFromTasks([0, 1, 2, 3, 4].map(task), date);
    expect(card?.earnedAt).toBe(date.toISOString());
    expect(card?.dailyKey).toBe('2026-09-10');
    expect(card?.sourceTasks).toHaveLength(5);
  });

  it('不足门槛时返回剩余数量且不生成', () => {
    const tasks = [task(1), task(2), task(3, false)];
    expect(remainingTasksForCard(tasks)).toBe(3);
    expect(generateCardFromTasks(tasks)).toBeNull();
  });
});
