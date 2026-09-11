import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingGuide } from '../../src/components/onboarding/OnboardingGuide';

describe('OnboardingGuide', () => {
  it('首次打开显示欢迎屏与开始参观按钮', () => {
    const onFinish = vi.fn();
    render(<OnboardingGuide open onFinish={onFinish} />);
    expect(screen.getByText('欢迎来到离谱发明所')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始参观' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一步' })).toBeDisabled();
  });

  it('点击下一步推进到登记实验屏', () => {
    render(<OnboardingGuide open onFinish={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '开始参观' }));
    expect(screen.getByText('登记「今日实验」')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一步' })).not.toBeDisabled();
  });

  it('最后一屏按钮变为开始第一项实验，点击触发 onFinish', () => {
    const onFinish = vi.fn();
    render(<OnboardingGuide open onFinish={onFinish} />);
    // 连点 7 次下一步到达收尾屏（共 8 屏）
    for (let i = 0; i < 7; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /下一步|开始参观/ }));
    }
    expect(screen.getByText('准备开工啦')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始第一项实验 ✓' }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('点击跳过立即触发 onFinish', () => {
    const onFinish = vi.fn();
    render(<OnboardingGuide open onFinish={onFinish} />);
    fireEvent.click(screen.getByRole('button', { name: '跳过指引' }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('Esc 键触发 onFinish', () => {
    const onFinish = vi.fn();
    render(<OnboardingGuide open onFinish={onFinish} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('open=false 时不渲染任何内容', () => {
    const { container } = render(<OnboardingGuide open={false} onFinish={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
