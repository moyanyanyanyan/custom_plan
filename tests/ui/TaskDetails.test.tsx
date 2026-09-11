import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskDetails } from '../../src/components/tasks/TaskDetails';
import { createTask } from '../../src/utils/taskModel';

const task = createTask({
  id: 'task-1', name: '写日记', icon: 'book', minutes: 10, completed: false, group: 'A',
  notes: '保留的历史备注', steps: [{ id: 'step-1', title: '列提纲', completed: false }],
});

describe('TaskDetails', () => {
  it('隐藏备注并允许编辑基础信息', () => {
    const onPatch = vi.fn();
    const onReschedule = vi.fn();
    render(<TaskDetails task={task} dateKey="2026-09-11"
      onPatch={onPatch} onReschedule={onReschedule} />);

    expect(screen.queryByText('备注')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('保留的历史备注')).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('写日记'), { target: { value: '写周记' } });
    fireEvent.change(screen.getByDisplayValue('2026-09-11'), { target: { value: '2026-09-12' } });
    expect(onPatch).toHaveBeenCalledWith({ name: '写周记' });
    expect(onReschedule).toHaveBeenCalledWith('2026-09-12');
  });

  it('支持勾选、删除以及按钮和回车添加步骤', () => {
    const onPatch = vi.fn();
    render(<TaskDetails task={task} dateKey="2026-09-11"
      onPatch={onPatch} onReschedule={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('完成步骤 列提纲'));
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({
      steps: [expect.objectContaining({ id: 'step-1', completed: true })],
    }));
    fireEvent.click(screen.getByLabelText('删除步骤 列提纲'));
    expect(onPatch).toHaveBeenCalledWith({ steps: [] });
    fireEvent.change(screen.getByLabelText('新步骤'), { target: { value: '写正文' } });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));
    expect(onPatch).toHaveBeenLastCalledWith(expect.objectContaining({
      steps: expect.arrayContaining([expect.objectContaining({ title: '写正文' })]),
    }));
    fireEvent.change(screen.getByLabelText('新步骤'), { target: { value: '校对' } });
    fireEvent.keyDown(screen.getByLabelText('新步骤'), { key: 'Enter' });
    expect(onPatch).toHaveBeenLastCalledWith(expect.objectContaining({
      steps: expect.arrayContaining([expect.objectContaining({ title: '校对' })]),
    }));
  });
});
