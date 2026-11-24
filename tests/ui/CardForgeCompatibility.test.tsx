import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useItems } from '../../src/hooks/useItems';
import { createDefaultData } from '../../src/constants/defaults';
import { generateCardFromTasks } from '../../src/utils/cardGenerator';
import { createTask } from '../../src/utils/taskModel';
import type { AppData } from '../../src/types/storage';

const mocks=vi.hoisted(()=>({read:vi.fn(),update:vi.fn(),copy:vi.fn()}));
vi.mock('../../src/hooks/useAppData',()=>({useAppData:()=>({data:mocks.read(),update:mocks.update})}));
vi.mock('../../src/utils/aiClient',()=>({generateItemCopy:mocks.copy,generateItemArt:vi.fn()}));
it('新卡仍可作为道具锻造来源',async()=>{
  const card=generateCardFromTasks(['读书','跑步','做饭','整理桌面','写代码'].map(name=>createTask({id:name,name,completed:true,icon:'flask',minutes:10,group:'A'})))!;
  let data={...createDefaultData(),cards:[card]};mocks.read.mockImplementation(()=>data);
  mocks.update.mockImplementation(async(fn:(current:AppData)=>AppData)=>{data=fn(data);return data;});
  mocks.copy.mockResolvedValue(null);
  const {result}=renderHook(()=>useItems());
  await act(()=>result.current.forge(card,card.tier));
  expect(mocks.copy).toHaveBeenCalledWith(card);
  expect(result.current.revealedItem).toMatchObject({sourceCardId:card.id,sourceCardName:card.name});
  expect(data.cards[0]).toEqual(card);
});
