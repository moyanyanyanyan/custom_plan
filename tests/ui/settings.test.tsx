import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from '../../src/components/settings/SettingsPanel';
import { AppDataContext } from '../../src/hooks/useAppData';
import { createDefaultData } from '../../src/constants/defaults';

describe('SettingsPanel', () => {
  it('调整透明度后提交完整设置', () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    const update = vi.fn();
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.7' } });
    fireEvent.click(screen.getByRole('button', { name: '应用设置' }));
    expect(update).toHaveBeenCalledOnce();
  });
});
