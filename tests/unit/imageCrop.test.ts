import { describe, expect, it } from 'vitest';
import { CROP_OUTPUT, CROP_RATIOS, constrainCrop } from '../../src/utils/imageCrop';

describe('imageCrop', () => {
  it('使用头像 1:1 和壁纸 12:17 的固定比例', () => {
    expect(CROP_RATIOS.avatar).toBe(1);
    expect(CROP_RATIOS.wallpaper).toBeCloseTo(12 / 17);
    expect(CROP_OUTPUT.wallpaper.width / CROP_OUTPUT.wallpaper.height).toBeCloseTo(12 / 17);
  });

  it('限制位移以避免裁剪区域出现空白', () => {
    expect(constrainCrop({ zoom: 1, offsetX: 999, offsetY: -999 }, 600, 400, 300, 300))
      .toEqual({ zoom: 1, offsetX: 75, offsetY: 0 });
    expect(constrainCrop({ zoom: 2, offsetX: -999, offsetY: 999 }, 600, 400, 300, 300))
      .toEqual({ zoom: 2, offsetX: -300, offsetY: 150 });
  });
});
