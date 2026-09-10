import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createDefaultData } from '../../constants/defaults';
import { AppDataContext } from '../../hooks/useAppData';
import type { AppData } from '../../types/storage';
import type { InventionCard } from '../../types/card';
import { claimDailyCard as claimCard, listenForAppData, loadAppData,
  saveAppData, updateStoredCard } from '../../utils/appRepository';
import { applyTheme } from '../../utils/theme';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'pending' | 'failed'>('saved');
  const dataRef = useRef(data);
  const writeQueue = useRef(Promise.resolve());
  const pending = useRef(0);
  const sourceId = useRef(crypto.randomUUID());

  useEffect(() => {
    let active = true;
    loadAppData().then((loaded) => {
      if (!active) return;
      // 启动读取较慢时保留用户已经提交的乐观更新，由队列基于最新数据重放。
      if (pending.current === 0) {
        dataRef.current = loaded;
        setData(loaded);
      }
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
      if (incoming.sourceId === sourceId.current || pending.current > 0) return;
      if (incoming.data.revision <= dataRef.current.revision) return;
      dataRef.current = incoming.data;
      setData(incoming.data);
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
    pending.current += 1;
    setSaveStatus('pending');
    writeQueue.current = writeQueue.current.then(async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const latest = await loadAppData();
          const candidate = { ...recipe(latest), updatedAt: new Date().toISOString() };
          const saved = await saveAppData(candidate, latest.revision, sourceId.current);
          pending.current -= 1;
          if (pending.current === 0) {
            dataRef.current = saved;
            setData(saved);
            setError('');
            setSaveStatus('saved');
          }
          return;
        } catch (reason) { lastError = reason; }
      }
      pending.current -= 1;
      setError(`数据尚未保存：${String(lastError)}`);
      setSaveStatus('failed');
    });
  }, []);

  const runAtomic = useCallback((action: () => Promise<AppData>) => {
    pending.current += 1;
    setSaveStatus('pending');
    const result = writeQueue.current.then(action);
    writeQueue.current = result.then((saved) => {
      pending.current -= 1;
      dataRef.current = saved;
      setData(saved);
      setError('');
      setSaveStatus(pending.current ? 'pending' : 'saved');
    }).catch((reason) => {
      pending.current -= 1;
      const code = typeof reason === 'object' && reason && 'code' in reason
        ? String((reason as { code: unknown }).code) : '';
      if (code === 'DAILY_CARD_EXISTS') {
        setSaveStatus(pending.current ? 'pending' : 'saved');
      } else {
        setError(`数据尚未保存：${String(reason)}`);
        setSaveStatus('failed');
      }
    });
    return result;
  }, []);

  const claimDailyCard = useCallback((dateKey: string, card: InventionCard) =>
    runAtomic(() => claimCard(dateKey, card, sourceId.current)), [runAtomic]);
  const updateCard = useCallback((cardId: string, patch: Partial<InventionCard>) =>
    runAtomic(() => updateStoredCard(cardId, patch, sourceId.current)), [runAtomic]);

  const value = useMemo(() => ({ data, ready, error, saveStatus, update, claimDailyCard, updateCard }),
    [data, ready, error, saveStatus, update, claimDailyCard, updateCard]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
