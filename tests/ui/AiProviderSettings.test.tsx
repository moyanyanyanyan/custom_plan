import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SettingsPanel } from '../../src/components/settings/SettingsPanel';
import { AppDataContext } from '../../src/hooks/useAppData';
import { createDefaultData } from '../../src/constants/defaults';
import type { AppData } from '../../src/types/storage';

vi.mock('../../src/utils/desktop',()=>({isDesktop:true,setPanelMode:vi.fn().mockResolvedValue(undefined)}));
it('保存硅基流动服务选择并保留密钥',async()=>{
  const data=createDefaultData();data.settings.stepfunApiKey='test-only-key';
  let saved=data;
  const update=vi.fn(async(fn:(current:AppData)=>AppData)=>{saved=fn(data);return saved;});
  render(<AppDataContext.Provider value={{data,ready:true,error:'',update}}>
    <SettingsPanel open onClose={()=>{}} />
  </AppDataContext.Provider>);
  fireEvent.change(screen.getByRole('combobox',{name:'AI 服务商'}),{target:{value:'siliconflow'}});
  fireEvent.click(screen.getByRole('button',{name:'应用设置'}));
  await waitFor(()=>expect(update).toHaveBeenCalledOnce());
  expect(saved.settings.aiProvider).toBe('siliconflow');
  expect(saved.settings.stepfunApiKey).toBe('test-only-key');
});
