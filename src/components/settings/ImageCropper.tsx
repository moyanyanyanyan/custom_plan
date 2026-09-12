import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CropResult, CropTarget, CropTransform } from '../../types/settings';
import { CROP_RATIOS, constrainCrop, createCroppedImage } from '../../utils/imageCrop';
import './cropper.css';

interface Props {
  target: CropTarget;
  onCancel: () => void;
  onConfirm: (result: CropResult) => void;
  onReselect: () => void;
}

export function ImageCropper({ target, onCancel, onConfirm, onReselect }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; transform: CropTransform } | null>(null);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [transform, setTransform] = useState<CropTransform>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const image = new Image(); image.src = target.source;
    void Promise.resolve(image.decode()).then(() => setImageSize({
      width: image.naturalWidth || 1, height: image.naturalHeight || 1,
    }));
  }, [target.source]);

  const constrain = (next: CropTransform) => {
    const box = viewport.current?.getBoundingClientRect();
    return box ? constrainCrop(next, imageSize.width, imageSize.height, box.width, box.height) : next;
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setTransform(constrain({ ...drag.current.transform,
      offsetX: drag.current.transform.offsetX + event.clientX - drag.current.x,
      offsetY: drag.current.transform.offsetY + event.clientY - drag.current.y }));
  };
  const confirm = async () => {
    const box = viewport.current?.getBoundingClientRect(); if (!box) return;
    setSaving(true); setError('');
    try { onConfirm(await createCroppedImage(target, transform, box.width, box.height)); }
    catch (reason) { setError(String(reason)); setSaving(false); }
  };
  const baseScale = Math.max(300 / imageSize.width, (300 / CROP_RATIOS[target.kind]) / imageSize.height);
  return <div className="cropper-overlay" role="dialog" aria-modal="true" aria-label={`裁剪${target.kind === 'avatar' ? '助手头像' : '面板壁纸'}`}>
    <section className="cropper-panel"><header><h3>框选{target.kind === 'avatar' ? '助手头像' : '面板壁纸'}</h3><button onClick={onCancel} aria-label="关闭裁剪">×</button></header>
      <div ref={viewport} className={`crop-viewport ${target.kind}`} style={{ aspectRatio: String(CROP_RATIOS[target.kind]) }}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, transform }; }}
        onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
        <img src={target.source} alt="待裁剪图片" draggable={false} style={{
          width: imageSize.width * baseScale * transform.zoom, height: imageSize.height * baseScale * transform.zoom,
          transform: `translate(calc(-50% + ${transform.offsetX}px), calc(-50% + ${transform.offsetY}px))`,
        }} />
        <span className="crop-guide" aria-hidden="true" />
      </div>
      <label className="crop-zoom">缩放<input aria-label="裁剪缩放" type="range" min="1" max="3" step="0.01" value={transform.zoom}
        onChange={(event) => setTransform(constrain({ ...transform, zoom: Number(event.target.value) }))} /></label>
      {error && <small role="alert">{error}</small>}
      <footer><button onClick={onReselect}>重新选择</button><button onClick={onCancel}>取消</button><button className="crop-confirm" disabled={saving} onClick={() => void confirm()}>{saving ? '处理中…' : '确认裁剪'}</button></footer>
    </section>
  </div>;
}
