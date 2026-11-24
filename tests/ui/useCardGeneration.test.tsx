import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCardGeneration } from '../../src/hooks/useCardGeneration';
import { createTask } from '../../src/utils/taskModel';
import { fallbackDraft } from '../../src/utils/fantasyCards';

const mocks=vi.hoisted(()=>({claim:vi.fn(),canGenerate:vi.fn(),copy:vi.fn(),art:vi.fn()}));
vi.mock('../../src/hooks/useCards',()=>({useCards:()=>({cards:[],claim:mocks.claim,canGenerate:mocks.canGenerate})}));
vi.mock('../../src/utils/aiClient',()=>({generateCardCopy:mocks.copy,generateCardArt:mocks.art}));
const sources=['读书','跑步','做饭','整理桌面','写代码'];
const tasks=sources.map(name=>createTask({id:name,name,completed:true,icon:'flask',minutes:10,group:'A'}));
beforeEach(()=>{vi.resetAllMocks();mocks.canGenerate.mockReturnValue(true);mocks.claim.mockResolvedValue(undefined);mocks.copy.mockResolvedValue({ordinary:fallbackDraft(sources)});mocks.art.mockResolvedValue('asset.png');});

it('不足5项不发起生成',async()=>{
  const {result}=renderHook(()=>useCardGeneration(tasks.slice(0,4)));
  await act(()=>result.current.generate());expect(mocks.copy).not.toHaveBeenCalled();
});
it('重复点击仅请求一次，图片失败仍正常领取',async()=>{
  mocks.art.mockRejectedValue(new Error('图片服务不可用'));
  const {result}=renderHook(()=>useCardGeneration(tasks));
  await act(async()=>{await Promise.all([result.current.generate(),result.current.generate()]);});
  expect(mocks.copy).toHaveBeenCalledOnce();expect(mocks.claim).toHaveBeenCalledOnce();
  expect(result.current.revealedCard?.version).toBe(2);expect(result.current.revealedCard?.imageAssetId).toBeUndefined();
  expect(result.current.warning).toContain('AI 插画生成失败');
});
it('文案失败使用有任务证据的本地卡',async()=>{
  mocks.copy.mockRejectedValue(new Error('offline'));
  const {result}=renderHook(()=>useCardGeneration(tasks));
  await act(()=>result.current.generate());
  expect(result.current.revealedCard?.inspiration?.[0].quote).toBe('读书');
  expect(result.current.revealedCard?.effect).toEqual(expect.any(String));
  expect(result.current.warning).toContain('本地模板');
});
it('文案与插画同时失败时保留两项原因，仍使用本地卡领取',async()=>{
  mocks.copy.mockRejectedValue(new Error('首选服务 TokenDance：HTTP 401'));
  mocks.art.mockRejectedValue(new Error('首选服务 TokenDance：HTTP 503'));
  const {result}=renderHook(()=>useCardGeneration(tasks));
  await act(()=>result.current.generate());
  expect(result.current.warning).toContain('文案生成失败');
  expect(result.current.warning).toContain('401');
  expect(result.current.warning).toContain('插画生成失败');
  expect(result.current.warning).toContain('503');
  expect(result.current.revealedCard?.version).toBe(2);
});
it.each([['DAILY_CARD_EXISTS','今天的卡牌已'],['disk full','卡牌保存失败']])('领取失败 %s 不揭晓',async(error,message)=>{
  mocks.claim.mockRejectedValue(new Error(error));
  const {result}=renderHook(()=>useCardGeneration(tasks));
  await act(()=>result.current.generate());
  await waitFor(()=>expect(result.current.warning).toContain(message));
  expect(result.current.revealedCard).toBeNull();expect(result.current.state).toBe('ready');
});
