import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentList } from '../../src/components/ExperimentList';
import type { Task } from '../../src/types/task';

const tasks: Task[] = Array.from({ length: 6 }, (_, index) => ({
  id: String(index), name: `任务 ${index}`, icon: 'flask', minutes: 10,
  completed: false, group: 'A', createdAt: '2026-09-10T00:00:00Z', completedAt: null,
}));

describe('ExperimentList', () => {
  it('只显示焦点附近任务并支持方向键移动', () => {
    render(<ExperimentList tasks={tasks} onToggle={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(5);
    const focused = screen.getByText('任务 2').closest('[role="button"]');
    fireEvent.keyDown(focused!, { key: 'ArrowDown' });
    expect(screen.getByText('任务 3').closest('[role="button"]')).toHaveClass('focused');
  });
});
