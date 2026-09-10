import { useRef, useState, type PointerEvent } from 'react';
import { desktopCommand } from '../utils/desktop';

/** 达到移动阈值才启动系统拖动，避免轻微手抖被识别为拖动。 */
export function useAvatar() {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [error, setError] = useState('');
  const run = (command: 'toggle_panel' | 'drag_avatar') => {
    setError('');
    void desktopCommand(command).catch((reason) => setError(String(reason)));
  };
  return {
    error,
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      origin.current = { x: event.screenX, y: event.screenY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const start = origin.current;
      if (!start || Math.hypot(event.screenX - start.x, event.screenY - start.y) < 5) return;
      origin.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      run('drag_avatar');
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (event.button === 0 && origin.current) run('toggle_panel');
      origin.current = null;
    },
    onPointerCancel() { origin.current = null; },
    onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        run('toggle_panel');
      }
    },
  };
}
