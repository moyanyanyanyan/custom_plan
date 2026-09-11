import { useEffect, useRef, useState } from 'react';
import type { RepeatRule } from '../../types/task';

type ActionPanel = 'reminder' | 'repeat' | null;

export function TaskRowActions({ taskName, reminderAt, repeatRule, onReminderChange,
  onRepeatChange, onExpand }: { taskName: string; reminderAt: string | null;
  repeatRule: RepeatRule | null; onReminderChange: (value: string) => void;
  onRepeatChange: (value: RepeatRule | null) => void; onExpand: () => void }) {
  const [panel, setPanel] = useState<ActionPanel>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reminderValue = reminderAt ? new Date(new Date(reminderAt).getTime()
    - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
    };
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, []);

  const togglePanel = (next: Exclude<ActionPanel, null>) => {
    setPanel((current) => current === next ? null : next);
  };

  return <div className="task-row-actions" ref={rootRef}>
    <button type="button" className={reminderAt ? 'active' : ''}
      aria-label={`${taskName}的提醒`} title="提醒" aria-expanded={panel === 'reminder'}
      onClick={() => togglePanel('reminder')}><BellIcon />{reminderAt && <i />}</button>
    <button type="button" className={repeatRule ? 'active' : ''}
      aria-label={`${taskName}的重复周期`} title="重复周期" aria-expanded={panel === 'repeat'}
      onClick={() => togglePanel('repeat')}><RepeatIcon /></button>
    <button type="button" aria-label={`${taskName}的更多设置`} title="更多设置"
      onClick={onExpand}><MoreIcon /></button>
    {panel === 'reminder' && <div className="task-action-popover reminder-popover">
      <strong>提醒时间</strong>
      <input type="datetime-local" aria-label={`${taskName}的提醒时间`}
        value={reminderValue} onChange={(event) => onReminderChange(event.target.value)} />
      {reminderAt && <button type="button" className="clear-action"
        onClick={() => onReminderChange('')}>清除提醒</button>}
    </div>}
    {panel === 'repeat' && <div className="task-action-popover repeat-popover"
      role="group" aria-label={`${taskName}的重复规则`}>
      <strong>实验周期</strong>
      {([['', '不重复'], ['daily', '每天'], ['weekly', '每周'],
        ['weekdays', '工作日']] as const).map(([value, label]) =>
        <button type="button" key={value} className={(repeatRule ?? '') === value ? 'selected' : ''}
          onClick={() => { onRepeatChange(value || null); setPanel(null); }}>{label}</button>)}
    </div>}
  </div>;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
}

function RepeatIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
}
