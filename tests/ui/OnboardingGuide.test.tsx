import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingGuide } from '../../src/components/onboarding/OnboardingGuide';

describe('OnboardingGuide', () => {
  it('目标在紧凑模式隐藏时使用居中引导卡片', () => {
    render(<>
      <button data-guide="machine" style={{ display: 'none' }}>发明机</button>
      <OnboardingGuide open onFinish={vi.fn()} />
    </>);

    const next = screen.getByRole('button', { name: '下一步' });
    for (let step = 0; step < 4; step += 1) fireEvent.click(next);

    expect(screen.getByRole('heading', { name: '发明机' })).toBeInTheDocument();
    expect(document.querySelector('.onboarding-card')).toHaveClass('centered');
    expect(document.querySelector('.onboarding-spotlight')).not.toBeInTheDocument();
  });
});
