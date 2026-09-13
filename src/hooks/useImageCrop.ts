import { useRef, useState, type ChangeEvent } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../constants/generation';
import type { CropResult, CropTarget, PendingUserAsset, UserAssetKind } from '../types/settings';
import { readUserAsset } from '../utils/appRepository';
import { validateImageDimensions } from '../utils/colorExtraction';

export function useImageCrop() {
  const [pending, setPending] = useState<Partial<Record<UserAssetKind, PendingUserAsset>>>({});
  const [errors, setErrors] = useState<Partial<Record<UserAssetKind, string>>>({});
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const inputs = useRef<Partial<Record<UserAssetKind, HTMLInputElement | null>>>({});
  const reset = () => { setPending({}); setErrors({}); setCropTarget(null); };
  const importImage = async (event: ChangeEvent<HTMLInputElement>, kind: UserAssetKind) => {
    const input = event.currentTarget; inputs.current[kind] = input;
    const file = input.files?.[0]; if (!file) return;
    input.value = '';
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setErrors((current) => ({ ...current, [kind]: '文件格式或大小不合规：仅支持 8MB 内的 PNG、JPEG 或 WebP' })); return;
    }
    setErrors((current) => ({ ...current, [kind]: '' }));
    try {
      const source = await readUserAsset(file); await validateImageDimensions(source);
      setCropTarget({ kind, file, source });
    } catch (reason) { setErrors((current) => ({ ...current, [kind]: `图片读取或尺寸校验失败：${String(reason)}` })); }
  };
  const acceptCrop = (result: CropResult) => {
    if (!cropTarget) return;
    setPending((current) => ({ ...current, [cropTarget.kind]: result })); setCropTarget(null);
  };
  const reselect = () => {
    const kind = cropTarget?.kind; setCropTarget(null);
    if (kind) inputs.current[kind]?.click();
  };
  return { pending, setPending, errors, setErrors, cropTarget, setCropTarget, importImage, acceptCrop, reselect, reset };
}
