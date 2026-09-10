import { describe, expect, it } from 'vitest';
import { buildThemeFromRgb } from '../../src/utils/colorExtraction';

describe('头像主题派生', () => {
  it('为彩色头像生成不同职责的语义色', () => {
    const theme = buildThemeFromRgb([85, 145, 225]);
    expect(theme.primary).not.toBe(theme.secondary);
    expect(theme.accent).not.toBe(theme.cardHighlight);
    expect(theme.completed).not.toBe(theme.pending);
    expect(theme.text).toBe('#f7f9ff');
  });

  it('灰色头像仍会获得可辨识强调色', () => {
    const theme = buildThemeFromRgb([150, 150, 150]);
    expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(theme.primary).not.toBe(theme.accent);
  });

  it('亮色头像生成的深色面板仍使用高对比文字', () => {
    expect(buildThemeFromRgb([250, 245, 225]).text).toBe('#f7f9ff');
  });
});
