import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddTaskControl } from '../../src/components/tasks/AddTaskControl';

describe('AddTaskControl', () => {
  it('点击展开并提交裁剪后的任务内容', () => {
    const add = vi.fn();
    render(<AddTaskControl onAdd={add} />);
    fireEvent.click(screen.getByRole('button', { name: /添加任务/ }));
    const input = screen.getByRole('textbox', { name: '任务内容' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '  整理桌面  ' } });
    fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }));
    expect(add).toHaveBeenCalledWith('整理桌面');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('空内容不可提交且 Escape 收起', () => {
    render(<AddTaskControl onAdd={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /添加任务/ }));
    expect(screen.getByRole('button', { name: '添加', exact: true })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
