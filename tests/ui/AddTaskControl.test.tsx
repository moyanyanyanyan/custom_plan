import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddTaskControl } from '../../src/components/tasks/AddTaskControl';

describe('AddTaskControl', () => {
  it('解析日期时间并提交结构化任务', () => {
    const add = vi.fn();
    render(<AddTaskControl date={new Date(2026, 8, 11, 9)} onAdd={add} />);
    const input = screen.getByRole('textbox', { name: '任务内容' });
    fireEvent.change(input, { target: { value: '明天下午三点取快递提醒我' } });
    expect(screen.getByLabelText('计划日期')).toHaveValue('2026-09-12');
    expect(screen.getByLabelText('计划时间')).toHaveValue('15:00');
    fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      title: '取快递', targetDate: '2026-09-12', time: '15:00',
    }));
    expect(input).toHaveValue('');
  });

  it('空内容不可提交且支持修改解析标签', () => {
    render(<AddTaskControl date={new Date(2026, 8, 11)} onAdd={vi.fn()} />);
    const addButton = screen.getByRole('button', { name: '添加', exact: true });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveAttribute('title', '添加任务');
    expect(addButton).toHaveTextContent('＋');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '每天喝水' } });
    expect(screen.getByLabelText('重复规则')).toHaveValue('daily');
    fireEvent.change(screen.getByLabelText('重复规则'), { target: { value: 'weekly' } });
    expect(screen.getByLabelText('重复规则')).toHaveValue('weekly');
  });

  it('清空计划日期时回退到当天，避免任务写入空日期', () => {
    const add = vi.fn();
    render(<AddTaskControl date={new Date(2026, 8, 11)} onAdd={add} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '整理资料' } });
    fireEvent.change(screen.getByLabelText('计划日期'), { target: { value: '' } });
    expect(screen.getByLabelText('计划日期')).toHaveValue('2026-09-11');
    fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ targetDate: '2026-09-11' }));
  });
});
