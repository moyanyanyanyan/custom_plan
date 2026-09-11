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
    const decoration = document.querySelector('.board-decoration');
    expect(decoration).toHaveAttribute('aria-hidden', 'true');
    expect(decoration).toHaveTextContent('异常指数：可控');
  });

  it('只有复选按钮切换完成，点击正文只聚焦', () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(handlers.onToggle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '完成 提交周报' }));
    expect(handlers.onToggle).toHaveBeenCalledWith('2026-09-11', '2');
  });

  it('历史备注不会单独显示展开提示', () => {
    const noteOnlyTask = { ...tasks[1], notes: '旧备注', steps: [] };
    render(<TodayTaskBoard tasks={[noteOnlyTask]} laterTasks={[]} dateKey="2026-09-11"
      date={new Date(2026, 8, 11)} pendingSlimeCount={0} onAdd={vi.fn()}
      onToggle={vi.fn()} onRemove={vi.fn()} onPatch={vi.fn()} onReschedule={vi.fn()}
      onMoveToday={vi.fn()} onOpenSlimes={vi.fn()} />);
    expect(screen.getByRole('button', { name: '提交周报' })).not.toHaveTextContent('旧备注');
  });

  it('通过实验工具设置周期并保持弹层互斥', () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole('button', { name: '提交周报的提醒' }));
    expect(screen.getByLabelText('提交周报的提醒时间')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '提交周报的重复周期' }));
    expect(screen.queryByLabelText('提交周报的提醒时间')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '每天' }));
    expect(handlers.onPatch).toHaveBeenCalledWith('2026-09-11', '2', expect.objectContaining({
      repeatRule: 'daily', seriesId: expect.any(String),
    }));
  });

  it('支持 Escape 和点击外部关闭工具弹层', () => {
    setup();
    const reminderButton = screen.getByRole('button', { name: '提交周报的提醒' });
    fireEvent.click(reminderButton);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('提交周报的提醒时间')).not.toBeInTheDocument();
    fireEvent.click(reminderButton);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText('提交周报的提醒时间')).not.toBeInTheDocument();
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

  it('稍后任务使用简洁入口而不显示快捷工具', () => {
    const laterTask = { task: { ...tasks[1], scheduledTime: '15:00' }, dateKey: '2026-09-12' };
    render(<TodayTaskBoard tasks={[]} laterTasks={[laterTask]} dateKey="2026-09-11"
      date={new Date(2026, 8, 11)} pendingSlimeCount={0} onAdd={vi.fn()}
      onToggle={vi.fn()} onRemove={vi.fn()} onPatch={vi.fn()} onReschedule={vi.fn()}
      onMoveToday={vi.fn()} onOpenSlimes={vi.fn()} />);
    fireEvent.click(screen.getByText('稍后'));
    expect(screen.getByText('明天 15:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 提交周报' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交周报的提醒' })).not.toBeInTheDocument();
  });
});
