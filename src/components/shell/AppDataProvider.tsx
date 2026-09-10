import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createDefaultData } from '../../constants/defaults';
import { AppDataContext } from '../../hooks/useAppData';
import type { AppData } from '../../types/storage';
import { listenForAppData, loadAppData, saveAppData } from '../../utils/appRepository';
import { applyTheme } from '../../utils/theme';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const dataRef = useRef(data);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    loadAppData().then((loaded) => {
      if (!active) return;
      dataRef.current = loaded;
      setData(loaded);
      setError(loaded.storageWarning ?? '');
      setReady(true);
    }).catch((reason) => {
      if (!active) return;
      setError(String(reason));
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let dispose: () => void = () => undefined;
    void listenForAppData((incoming) => {
      dataRef.current = incoming;
      setData(incoming);
    }).then((unlisten) => { dispose = unlisten; });
    return () => dispose();
  }, []);

  useEffect(() => {
    void applyTheme(data.settings).catch(() => setError('主题资源读取失败，已保留安全配色'));
  }, [data.settings]);

  const update = useCallback((recipe: (current: AppData) => AppData) => {
    const next = { ...recipe(dataRef.current), updatedAt: new Date().toISOString() };
    dataRef.current = next;
    setData(next);
    writeQueue.current = writeQueue.current.then(() => saveAppData(next)).catch((reason) => {
      setError(`数据保存失败：${String(reason)}`);
    });
  }, []);

  const value = useMemo(() => ({ data, ready, error, update }), [data, ready, error, update]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
