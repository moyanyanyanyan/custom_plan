import type { ThemeSettings } from '../types/settings';
import { DEFAULT_THEME } from '../constants/theme';

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(red: number, green: number, blue: number) {
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function hex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** 降采样既避免大图阻塞界面，也让主题取色更偏向整体视觉。 */
export async function extractTheme(dataUrl: string): Promise<ThemeSettings> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return DEFAULT_THEME;
  context.drawImage(image, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  let red = 0; let green = 0; let blue = 0; let count = 0;
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 128) continue;
    red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count += 1;
  }
  if (!count) return DEFAULT_THEME;
  const rgb = [red, green, blue].map((value) => Math.round(value / count));
  const primary = hex(Math.round(rgb[0] * 0.42), Math.round(rgb[1] * 0.42), Math.round(rgb[2] * 0.42));
  const accent = hex(...rgb as [number, number, number]);
  const text = luminance(...rgb as [number, number, number]) > 0.52 ? '#14213d' : '#f7f9ff';
  return { ...DEFAULT_THEME, primary, secondary: accent, accent, text, cardHighlight: accent, slimeTint: accent };
}

export async function validateImageDimensions(source: string): Promise<void> {
  const image = new Image();
  image.src = source;
  await image.decode();
  if (image.naturalWidth > 6000 || image.naturalHeight > 6000) {
    throw new Error('图片尺寸不能超过 6000×6000');
  }
}
