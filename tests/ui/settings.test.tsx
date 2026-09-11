import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from '../../src/components/settings/SettingsPanel';
import { AppDataContext } from '../../src/hooks/useAppData';
import { createDefaultData } from '../../src/constants/defaults';
import * as repository from '../../src/utils/appRepository';
import * as cropUtils from '../../src/utils/imageCrop';

function mockCrop(kind: 'avatar' | 'wallpaper') {
  return vi.spyOn(cropUtils, 'createCroppedImage').mockResolvedValue({
    file: new File(['cropped'], `${kind}-cropped.jpg`, { type: 'image/jpeg' }),
    previewSource: `data:image/jpeg;base64,${kind}`,
  });
}

describe('SettingsPanel', () => {
  it('窗口模式使用可访问的分段选项并同步选中态', () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update: vi.fn() }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);
    const standard = screen.getByRole('radio', { name: '标准模式' });
    const compact = screen.getByRole('radio', { name: '紧凑模式' });
    expect(standard).toBeChecked();
    expect(standard.closest('label')).toHaveClass('selected');
    fireEvent.click(compact);
    expect(compact).toBeChecked();
    expect(compact.closest('label')).toHaveClass('selected');
    expect(standard.closest('label')).not.toHaveClass('selected');
  });

  it('无壁纸时隐藏壁纸遮罩设置', () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update: vi.fn() }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('已有壁纸时调整遮罩强度并提交完整设置', () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    data.settings.wallpaperAssetId = 'saved-wallpaper';
    const update = vi.fn();
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.7' } });
    fireEvent.click(screen.getByRole('button', { name: '应用设置' }));
    expect(update).toHaveBeenCalledOnce();
  });

  it('确认壁纸裁剪后显示预览和遮罩设置', async () => {
    mockCrop('wallpaper');
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    render(<AppDataContext.Provider value={{ data, ready: true, error: '', update: vi.fn() }}>
      <SettingsPanel open onClose={vi.fn()} />
    </AppDataContext.Provider>);
    const wallpaperInput = screen.getByText('面板壁纸', { selector: 'label' })
      .querySelector('input[type="file"]');
    fireEvent.change(wallpaperInput!, {
      target: { files: [new File(['wallpaper'], 'wallpaper.jpg', { type: 'image/jpeg' })] },
    });
    expect(await screen.findByRole('dialog', { name: '裁剪面板壁纸' })).toBeVisible();
    expect(screen.queryByAltText('面板壁纸预览')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认裁剪' }));
    await screen.findByAltText('面板壁纸预览');
    expect(screen.getByRole('slider', { name: '壁纸遮罩强度' })).toBeVisible();
  });

  it('确认头像裁剪后更新预览和自动配色', async () => {
    const data = createDefaultData(new Date('2026-09-10T00:00:00Z'));
    const update = vi.fn();
    const saveAsset = vi.spyOn(repository, 'saveUserAsset');
    mockCrop('avatar');
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

    expect(await screen.findByRole('dialog', { name: '裁剪助手头像' })).toBeVisible();
    expect(screen.queryByAltText('助手头像预览')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认裁剪' }));
    await waitFor(() => expect(screen.getByAltText('助手头像预览')).toHaveAttribute('src',
      expect.stringContaining('data:image/jpeg;base64,')));
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
    const dialog = await screen.findByRole('dialog', { name: '裁剪面板壁纸' });
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByAltText('面板壁纸预览')).not.toBeInTheDocument();
    expect(saveAsset).not.toHaveBeenCalled();
  });
});
