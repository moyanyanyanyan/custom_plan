import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CardDialog } from '../../src/components/cards/CardDialog';
import { CardFace } from '../../src/components/cards/CardFace';
import { generateCardFromTasks } from '../../src/utils/cardGenerator';
import { createTask } from '../../src/utils/taskModel';

const card=generateCardFromTasks(['读书','跑步','做饭','整理桌面','写代码'].map(name=>createTask({id:name,name,completed:true,icon:'flask',minutes:10,group:'A'})))!;
it('正面显示连续效果和吐槽，设定及来源只在卡外', () => {
  const {container}=render(<CardDialog cards={[card]} onClose={()=>{}} />);
  const face=document.querySelector('.fantasy-card')!;
  expect(face.textContent).toContain(card.effect);
  expect(face.textContent).toContain(card.description);
  expect(face.textContent).not.toContain(card.setting);
  expect(face.textContent).not.toContain(card.date);
  expect(face.querySelectorAll('.fantasy-effect p')).toHaveLength(1);
  expect(screen.getByText(card.setting,{exact:false})).toBeInTheDocument();
  expect(container.querySelector('.fantasy-card')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'翻到背面'}));
  expect(screen.getByLabelText('角色扮演牌背')).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'效果'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'翻回正面'}));
  expect(screen.getByRole('heading',{name:'效果'})).toBeInTheDocument();
});
it('弹窗限制焦点，Escape关闭并恢复焦点', () => {
  const close=vi.fn(); const trigger=document.createElement('button'); document.body.append(trigger); trigger.focus();
  const view=render(<CardDialog cards={[card]} onClose={close} />);
  expect(screen.getByRole('button',{name:'关闭卡牌'})).toHaveFocus();
  fireEvent.keyDown(document,{key:'Tab',shiftKey:true});
  expect(screen.getByRole('button',{name:'翻到背面'})).toHaveFocus();
  fireEvent.keyDown(document,{key:'Escape'}); expect(close).toHaveBeenCalledOnce();
  view.unmount(); expect(trigger).toHaveFocus(); trigger.remove();
});
it('旧卡保留原文，不伪造效果和花色', () => {
  const legacy={...card,version:undefined,description:'旧版完整原文'};
  const {container}=render(<CardFace card={legacy} />);
  expect(screen.getByText('“旧版完整原文”')).toBeInTheDocument();
  expect(container.querySelector('.fantasy-corner')).toBeNull();
  expect(screen.queryByText('效果')).toBeNull();
});
