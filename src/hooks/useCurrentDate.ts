import { useCallback, useEffect, useMemo, useState } from 'react';
import { localDateKey } from '../utils/date';

/** 统一提供本地自然日，避免长期开启应用后继续使用昨天的状态。 */
export function useCurrentDate() {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => setNow(new Date()), []);

  useEffect(() => {
    const delay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
      - Date.now() + 50;
    const timer = window.setTimeout(refresh, Math.max(50, delay));
    const onVisible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [now, refresh]);

  return useMemo(() => ({ now, dateKey: localDateKey(now) }), [now]);
}
