import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddTaskControl } from '../../src/components/tasks/AddTaskControl';

describe('AddTaskControl', () => {
  it('解析日期时间并提交结构化任务', () => {
    const add = vi.fn();
    render(<AddTaskControl date={new Date(2026, 8, 11, 9)} onAdd={add} />);
    const input = screen.getByRole('textbox', { name: '任务内容' });
    fireEvent.change(input, { target: { value: '明天下午三点取快递提醒我' } });
    expect(screen.getByText('明天')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getAllByText('已设置提醒').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '任务设置' }));
    expect(screen.getByLabelText('计划日期')).toHaveValue('2026-09-12');
    expect(screen.getByLabelText('计划时间')).toHaveValue('15:00');
    fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      title: '取快递', targetDate: '2026-09-12', time: '15:00',
    }));
    expect(input).toHaveValue('');
  });

  it('空内容不可提交且支持修改解析标签', () => {
    const add = vi.fn();
    render(<AddTaskControl date={new Date(2026, 8, 11)} onAdd={add} />);
    const addButton = screen.getByRole('button', { name: '添加', exact: true });
    // 「＋」不再使用 disabled：禁用态按钮收不到点击、点了毫无反馈，用户会以为「点了没用」。
    // 改为 aria-disabled + 点击时空提交被拦下并提示、同时聚焦输入框。
    expect(addButton).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(addButton);
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('请先输入任务内容');
    expect(addButton).toHaveAttribute('title', '添加任务');
    expect(addButton).toHaveTextContent('＋');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '每天喝水' } });
    expect(screen.getByText('每天')).toBeInTheDocument();
    expect(screen.queryByLabelText('重复规则')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '任务设置' }));
    expect(screen.getByLabelText('重复规则')).toHaveValue('daily');
    expect(screen.getByText('完成本次后，将自动安排下一次')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('重复规则'), { target: { value: 'weekly' } });
    expect(screen.getByLabelText('重复规则')).toHaveValue('weekly');
  });

  it('清空计划日期时回退到当天，避免任务写入空日期', () => {
    const add = vi.fn();
    render(<AddTaskControl date={new Date(2026, 8, 11)} onAdd={add} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '整理资料' } });
    expect(screen.queryByLabelText('计划日期')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '任务设置' }));
    fireEvent.change(screen.getByLabelText('计划日期'), { target: { value: '' } });
    expect(screen.getByLabelText('计划日期')).toHaveValue('2026-09-11');
    fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ targetDate: '2026-09-11' }));
  });

  it('提醒缺少时间时自动打开设置并支持 Escape 关闭', () => {
    render(<AddTaskControl date={new Date(2026, 8, 11)} onAdd={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '提醒我交周报' } });
    expect(screen.getByText('提醒时间待设置')).toBeInTheDocument();
    expect(screen.getByLabelText('计划日期')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('计划日期')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '任务设置' })).toHaveFocus();
  });

  it('点击组件外关闭设置但保留草稿值', () => {
    render(<div><AddTaskControl date={new Date(2026, 8, 11)} onAdd={vi.fn()} /><button>外部</button></div>);
    fireEvent.click(screen.getByRole('button', { name: '任务设置' }));
    fireEvent.change(screen.getByLabelText('计划时间'), { target: { value: '16:30' } });
    fireEvent.pointerDown(screen.getByRole('button', { name: '外部' }));
    expect(screen.queryByLabelText('计划时间')).not.toBeInTheDocument();
    expect(screen.getByText('16:30')).toBeInTheDocument();
  });

  it('设置面板打开时保持按钮状态并允许操作提醒控件', () => {
    render(<AddTaskControl date={new Date(2026, 8, 11)} onAdd={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: '任务设置' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(screen.getByLabelText('提醒日期'), { target: { value: '2026-09-12' } });
    fireEvent.change(screen.getByLabelText('提醒时刻'), { target: { value: '09:30' } });
    expect(screen.getAllByText('已设置提醒').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '清除' }));
    expect(screen.getByText('未设置提醒')).toBeInTheDocument();
  });
});
