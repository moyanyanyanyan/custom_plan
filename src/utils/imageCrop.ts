import type { CropResult, CropTarget, CropTransform } from '../types/settings';

export const CROP_RATIOS = { avatar: 1, wallpaper: 12 / 17 } as const;
export const CROP_OUTPUT = {
  avatar: { width: 512, height: 512 },
  wallpaper: { width: 720, height: 1020 },
} as const;

export function constrainCrop(
  transform: CropTransform, imageWidth: number, imageHeight: number,
  viewportWidth: number, viewportHeight: number,
): CropTransform {
  const baseScale = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const width = imageWidth * baseScale * transform.zoom;
  const height = imageHeight * baseScale * transform.zoom;
  const maxX = Math.max(0, (width - viewportWidth) / 2);
  const maxY = Math.max(0, (height - viewportHeight) / 2);
  const clamp = (value: number, limit: number) => limit === 0 ? 0 : Math.max(-limit, Math.min(limit, value));
  return {
    zoom: transform.zoom,
    offsetX: clamp(transform.offsetX, maxX),
    offsetY: clamp(transform.offsetY, maxY),
  };
}

/** 将用户看到的固定比例区域直接导出，保证保存结果与预览一致。 */
export async function createCroppedImage(
  target: CropTarget, transform: CropTransform, viewportWidth: number, viewportHeight: number,
): Promise<CropResult> {
  const image = new Image(); image.src = target.source; await image.decode();
  const safe = constrainCrop(transform, image.naturalWidth, image.naturalHeight, viewportWidth, viewportHeight);
  const baseScale = Math.max(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight);
  const scale = baseScale * safe.zoom;
  const sourceWidth = viewportWidth / scale;
  const sourceHeight = viewportHeight / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2 - safe.offsetX / scale;
  const sourceY = (image.naturalHeight - sourceHeight) / 2 - safe.offsetY / scale;
  const output = CROP_OUTPUT[target.kind];
  const canvas = document.createElement('canvas'); canvas.width = output.width; canvas.height = output.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前环境无法处理图片');
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, output.width, output.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('裁剪图片生成失败');
  const name = target.file.name.replace(/\.[^.]+$/, '') || target.kind;
  const file = new File([blob], `${name}-cropped.jpg`, { type: 'image/jpeg' });
  return { file, previewSource: canvas.toDataURL('image/jpeg', 0.9) };
}
