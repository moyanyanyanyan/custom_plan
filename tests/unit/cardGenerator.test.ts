import { describe, expect, it } from 'vitest';
import { appendBackTasks, generateCardFromTasks, getMachineState, remainingTasksForCard } from '../../src/utils/cardGenerator';
import type { Task } from '../../src/types/task';
import { localDateKey } from '../../src/utils/date';

/** 相对基准日往前 offset 天的卡牌日期键（材质等级靠它推连续天数）。 */
function dayKey(base: Date, offset: number): { dailyKey: string } {
  const d = new Date(base);
  d.setDate(d.getDate() - offset);
  return { dailyKey: localDateKey(d) };
}

function task(index: number, completed = true): Task {
  return {
    id: `task-${index}`, name: `任务 ${index}`, icon: 'flask', minutes: 10,
    completed, group: 'A', createdAt: '2026-09-10T00:00:00.000Z',
    completedAt: completed ? '2026-09-10T01:00:00.000Z' : null,
  };
}

describe('cardGenerator', () => {
  it('覆盖发明机的四种状态', () => {
    expect(getMachineState(5, false, false)).toBe('locked');
    expect(getMachineState(0, false, false)).toBe('ready');
    expect(getMachineState(0, false, true)).toBe('generating');
    expect(getMachineState(0, true, false)).toBe('completed');
  });
  it('完成五项后按注入时间生成卡牌', () => {
    const date = new Date('2026-09-10T12:00:00.000Z');
    const card = generateCardFromTasks([0, 1, 2, 3, 4].map((index) => task(index)), date);
    expect(card?.earnedAt).toBe(date.toISOString());
    expect(card?.dailyKey).toBe('2026-09-10');
    expect(card?.sourceTasks).toHaveLength(5);
  });

  it('不足门槛时返回剩余数量且不生成', () => {
    const tasks = [task(1), task(2), task(3, false)];
    expect(remainingTasksForCard(tasks)).toBe(3);
    expect(generateCardFromTasks(tasks)).toBeNull();
  });

  it('连续研究天数决定卡牌材质等级', () => {
    const date = new Date();
    const five = [0, 1, 2, 3, 4].map((index) => task(index));
    // 首张卡：连今天一起算 1 天 → 铜
    expect(generateCardFromTasks(five, date, [])?.tier).toBe('copper');
    // 断档（只有前天，接不上今天）→ 仍算 1 天 → 铜
    expect(generateCardFromTasks(five, date, [dayKey(date, 2)])?.tier).toBe('copper');
    // 今天 + 前 3 天 = 连续 4 天 → 银
    expect(generateCardFromTasks(five, date, [1, 2, 3].map((o) => dayKey(date, o)))?.tier).toBe('silver');
    // 今天 + 前 8 天 = 连续 9 天 → 金
    expect(generateCardFromTasks(five, date, [1, 2, 3, 4, 5, 6, 7, 8].map((o) => dayKey(date, o)))?.tier).toBe('gold');
  });

  it('追加背面任务时去重、截断到 10 字符，无新任务返回 null', () => {
    const card = { sourceTasks: ['已有任务'], backTasks: ['已有任务'] };
    // 已在卡上的任务不再追加，只补新的；新任务名与生成时一致截断到 10 字符
    expect(appendBackTasks(card, ['已有任务', '一个非常长的任务名字啊啊'])).toEqual({
      sourceTasks: ['已有任务', '一个非常长的任务名字啊啊'],
      backTasks: ['已有任务', '一个非常长的任务名字'],
    });
    // 完全没有新任务 → null（调用方据此跳过写盘）
    expect(appendBackTasks(card, ['已有任务'])).toBeNull();
  });

  it('追加时保留原有顺序、只补新增项', () => {
    const card = { sourceTasks: ['A'], backTasks: ['A'] };
    expect(appendBackTasks(card, ['B', 'A', 'C'])).toEqual({
      sourceTasks: ['A', 'B', 'C'],
      backTasks: ['A', 'B', 'C'],
    });
  });
});
