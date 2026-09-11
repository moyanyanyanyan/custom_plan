import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlimeDrawer } from '../../src/components/slimes/SlimeDrawer';
import type { SlimeCompanion } from '../../src/types/slime';

const handlers = () => ({ onFocus: vi.fn(), onComplete: vi.fn(), onReschedule: vi.fn(),
  onSplit: vi.fn(), onDiscard: vi.fn() });
const content: SlimeCompanion = { mood: 'content', meals: [{ taskId: 'old-1',
  taskName: '整理旧资料', taskDate: '2026-09-10', swallowedAt: '2026-09-11T01:00:00Z', wanderingDays: 2 }] };

describe('SlimeDrawer', () => {
  it('空腹时仍常驻并显示轻盈状态', () => {
    render(<SlimeDrawer slime={{ mood: 'light', meals: [] }} {...handlers()} />);
    expect(screen.getByRole('button', { name: /肚子空空/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('展开肚子并提供柔和处理入口', () => {
    const actions = handlers();
    render(<SlimeDrawer slime={content} {...actions} />);
    const handle = screen.getByRole('button', { name: /我替你收好了 1 件事/ });
    fireEvent.click(handle);
    expect(handle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('整理旧资料')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '做 5 分钟' }));
    expect(actions.onFocus).toHaveBeenCalledWith('2026-09-10', 'old-1');
    fireEvent.click(screen.getByRole('button', { name: '完成消化' }));
    expect(actions.onComplete).toHaveBeenCalledWith('old-1');
    fireEvent.click(screen.getByRole('button', { name: '拆小一点' }));
    expect(actions.onSplit).toHaveBeenCalledWith('2026-09-10', 'old-1');
  });
});
