import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TodayTaskBoard } from '../../src/components/tasks/TodayTaskBoard';
import type { Task } from '../../src/types/task';
import { createTask } from '../../src/utils/taskModel';

const tasks: Task[] = [
  createTask({ id: '1', name: '整理桌面', icon: 'grid', minutes: 10, completed: true,
    group: 'A', createdAt: '2026-09-11T01:00:00Z', completedAt: '2026-09-11T02:00:00Z' }),
  createTask({ id: '2', name: '提交周报', icon: 'book', minutes: 10, completed: false,
    group: 'A', createdAt: '2026-09-11T01:00:00Z', completedAt: null }),
];

const setup = (pendingSlimeCount = 0) => {
  const handlers = { onAdd: vi.fn(), onToggle: vi.fn(), onRemove: vi.fn(), onPatch: vi.fn(),
    onReschedule: vi.fn(), onMoveToday: vi.fn(), onOpenSlimes: vi.fn() };
  render(<TodayTaskBoard tasks={tasks} laterTasks={[]} dateKey="2026-09-11"
    date={new Date(2026, 8, 11)}
    pendingSlimeCount={pendingSlimeCount} {...handlers} />);
  return handlers;
};

describe('TodayTaskBoard', () => {
  it('展示日期、完成进度和能量统计', () => {
    setup();
    expect(screen.getByRole('heading', { name: /9月11日.*今天/ })).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('稳定余波').parentElement).toHaveTextContent('1');
    expect(screen.getByText('停滞能量').parentElement).toHaveTextContent('1');
  });

  it('只有复选按钮切换完成，点击正文只聚焦', () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(handlers.onToggle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '完成 提交周报' }));
    expect(handlers.onToggle).toHaveBeenCalledWith('2026-09-11', '2');
  });

  it('内联添加任务并保留删除确认', () => {
    const handlers = setup();
    fireEvent.change(screen.getByRole('textbox', { name: '任务内容' }),
      { target: { value: '  喝水  ' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));
    expect(handlers.onAdd).toHaveBeenCalledWith(expect.objectContaining({ title: '喝水' }));
  });

  it('仅在存在过夜任务时提供史莱姆入口', () => {
    const inactive = setup();
    expect(screen.queryByRole('button', { name: /史莱姆图鉴/ })).not.toBeInTheDocument();
    expect(inactive.onOpenSlimes).not.toHaveBeenCalled();
    const active = setup(3);
    fireEvent.click(screen.getByRole('button', { name: /有 3 件没做完的事/ }));
    expect(active.onOpenSlimes).toHaveBeenCalledOnce();
  });
});
