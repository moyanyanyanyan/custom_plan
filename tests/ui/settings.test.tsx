import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from '../../src/components/settings/SettingsPanel';
import { AppDataContext } from '../../src/hooks/useAppData';
import { createDefaultData } from '../../src/constants/defaults';
import * as repository from '../../src/utils/appRepository';

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

  it('导入头像后立即更新预览和自动配色', async () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    const update = vi.fn();
    const saveAsset = vi.spyOn(repository, 'saveUserAsset');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([210, 70, 90, 255]) }),
    } as unknown as CanvasRenderingContext2D);
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const avatarInput = screen.getByText('助手头像', { selector: 'label' })
      .querySelector('input[type="file"]');
    expect(avatarInput).not.toBeNull();
    fireEvent.change(avatarInput!, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByAltText('助手头像预览')).toHaveAttribute('src',
      expect.stringContaining('data:image/png;base64,')));
    expect(saveAsset).not.toHaveBeenCalled();
    expect(screen.getByLabelText('主背景')).not.toHaveValue(data.settings.theme.primary);
    fireEvent.click(screen.getByRole('button', { name: '应用设置' }));
    await waitFor(() => expect(saveAsset).toHaveBeenCalledOnce());
  });

  it('取消时不保存待提交图片', async () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    const saveAsset = vi.spyOn(repository, 'saveUserAsset');
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update: vi.fn() }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);
    const wallpaperInput = screen.getByText('面板壁纸', { selector: 'label' })
      .querySelector('input[type="file"]');
    fireEvent.change(wallpaperInput!, {
      target: { files: [new File(['wallpaper'], '仆人.jpg', { type: 'image/jpeg' })] },
    });
    await screen.findByAltText('面板壁纸预览');
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(saveAsset).not.toHaveBeenCalled();
  });
});
