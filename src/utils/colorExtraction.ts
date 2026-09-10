import type { ThemeSettings } from '../types/settings';
import { DEFAULT_THEME } from '../constants/theme';

type Rgb = [number, number, number];
type Hsl = [number, number, number];

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]: Rgb) {
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function hexToRgb(value: string): Rgb {
  return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as Rgb;
}

function readableText(background: string) {
  const level = luminance(hexToRgb(background));
  const whiteContrast = 1.05 / (level + 0.05);
  const darkContrast = (level + 0.05) / 0.06;
  return whiteContrast >= darkContrast ? '#f7f9ff' : '#101827';
}

function rgbToHsl([redByte, greenByte, blueByte]: Rgb): Hsl {
  const [red, green, blue] = [redByte, greenByte, blueByte].map((value) => value / 255);
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue);
  const light = (max + min) / 2; const delta = max - min;
  if (!delta) return [0, 0, light];
  const saturation = delta / (1 - Math.abs(2 * light - 1));
  const hue = max === red ? ((green - blue) / delta) % 6
    : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return [((hue * 60) + 360) % 360, saturation, light];
}

function hslToHex([hue, saturation, light]: Hsl) {
  const chroma = (1 - Math.abs(2 * light - 1)) * saturation;
  const segment = hue / 60; const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const values = segment < 1 ? [chroma, x, 0] : segment < 2 ? [x, chroma, 0]
    : segment < 3 ? [0, chroma, x] : segment < 4 ? [0, x, chroma]
      : segment < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const match = light - chroma / 2;
  return `#${values.map((value) => Math.round((value + match) * 255)
    .toString(16).padStart(2, '0')).join('')}`;
}

/** 从代表色派生有明确语义且保持深色面板可读性的完整主题。 */
export function buildThemeFromRgb(rgb: Rgb): ThemeSettings {
  const [hue, rawSaturation] = rgbToHsl(rgb);
  const saturation = Math.max(rawSaturation, 0.38);
  const primary = hslToHex([hue, Math.min(saturation * 0.72, 0.72), 0.17]);
  const secondary = hslToHex([(hue + 18) % 360, Math.min(saturation * 0.62, 0.64), 0.29]);
  const accent = hslToHex([hue, Math.max(saturation, 0.58), 0.68]);
  return {
    primary, secondary, accent,
    completed: hslToHex([(hue + 115) % 360, 0.62, 0.66]),
    pending: hslToHex([(hue + 48) % 360, 0.72, 0.68]),
    text: readableText(primary),
    cardHighlight: hslToHex([(hue + 42) % 360, 0.78, 0.68]),
    slimeTint: hslToHex([(hue + 145) % 360, 0.48, 0.64]),
  };
}

function representativeColor(pixels: Uint8ClampedArray): Rgb | null {
  const buckets = new Map<number, { red: number; green: number; blue: number; count: number; score: number }>();
  for (let index = 0; index < pixels.length; index += 16) {
    const rgb: Rgb = [pixels[index], pixels[index + 1], pixels[index + 2]];
    if (pixels[index + 3] < 128) continue;
    const [, saturation, light] = rgbToHsl(rgb);
    if (light < 0.08 || light > 0.96) continue;
    const key = (rgb[0] >> 5) << 6 | (rgb[1] >> 5) << 3 | (rgb[2] >> 5);
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, count: 0, score: 0 };
    bucket.red += rgb[0]; bucket.green += rgb[1]; bucket.blue += rgb[2]; bucket.count += 1;
    bucket.score += 0.35 + saturation * 1.4 + (1 - Math.abs(light - 0.55)) * 0.35;
    buckets.set(key, bucket);
  }
  const winner = [...buckets.values()].sort((left, right) => right.score - left.score)[0];
  return winner ? [winner.red, winner.green, winner.blue].map((value) =>
    Math.round(value / winner.count)) as Rgb : null;
}

/** 降采样用于避免大图阻塞界面，并按色彩信息选择代表色。 */
export async function extractTheme(dataUrl: string): Promise<ThemeSettings> {
  const image = new Image(); image.src = dataUrl; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 48;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return DEFAULT_THEME;
  context.drawImage(image, 0, 0, 48, 48);
  const representative = representativeColor(context.getImageData(0, 0, 48, 48).data);
  return representative ? buildThemeFromRgb(representative) : DEFAULT_THEME;
}

export async function validateImageDimensions(source: string): Promise<void> {
  const image = new Image(); image.src = source; await image.decode();
  if (image.naturalWidth > 6000 || image.naturalHeight > 6000) {
    throw new Error('图片尺寸不能超过 6000×6000');
  }
}
