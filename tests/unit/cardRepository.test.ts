import { beforeEach, expect, it, vi } from 'vitest';
import { claimDailyCard, loadAppData } from '../../src/utils/appRepository';
import { generateCardFromTasks } from '../../src/utils/cardGenerator';
import { createTask } from '../../src/utils/taskModel';

const card=generateCardFromTasks(['读书','跑步','做饭','整理桌面','写代码'].map(name=>createTask({id:name,name,completed:true,icon:'flask',minutes:10,group:'A'})))!;
beforeEach(()=>localStorage.clear());
it('并发领取只保存一张',async()=>{
  const results=await Promise.allSettled([claimDailyCard(card.dailyKey,card,'one'),claimDailyCard(card.dailyKey,{...card,id:'two'},'two')]);
  expect(results.map(result=>result.status)).toEqual(['fulfilled','rejected']);
  expect((await loadAppData()).cards).toHaveLength(1);
});
it('保存重载后拒绝重复领取，日期以领取键为准',async()=>{
  await claimDailyCard(card.dailyKey,card,'test');
  const data=await loadAppData(); expect(data.cards[0]).toEqual(card);
  await expect(claimDailyCard(card.dailyKey,{...card,id:'second'},'test')).rejects.toThrow('DAILY_CARD_EXISTS');
  expect((await loadAppData()).cards).toHaveLength(1);
});
it('存储写入失败会拒绝领取',async()=>{
  await loadAppData();
  const set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
  try { await expect(claimDailyCard(card.dailyKey,card,'test')).rejects.toThrow('quota'); }
  finally { set.mockRestore(); }
  expect((await loadAppData()).cards).toHaveLength(0);
});
