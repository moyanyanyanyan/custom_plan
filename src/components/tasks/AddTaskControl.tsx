import { useEffect, useRef, useState } from 'react';
import type { RepeatRule, TaskDraft } from '../../types/task';
import { suggestTaskSteps } from '../../utils/aiClient';
import { localDateKey } from '../../utils/date';
import { formatTaskDate, parseTaskInput } from '../../utils/taskParser';
import { Icon } from '../Icon';

const repeatLabels: Record<RepeatRule, string> = {
  daily: '每天', weekly: '每周', weekdays: '工作日',
};

export function AddTaskControl({ date, onAdd }: { date: Date; onAdd: (draft: TaskDraft) => string | void }) {
  const [raw, setRaw] = useState('');
  const [draft, setDraft] = useState(() => parseTaskInput('', date));
  const [suggestion, setSuggestion] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderDateDraft, setReminderDateDraft] = useState('');
  const [reminderTimeDraft, setReminderTimeDraft] = useState('');
  const version = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const complex = /[：:、；;]/.test(raw) || (raw.match(/[，,]/g)?.length ?? 0) >= 2;
  useEffect(() => {
    if (!complex || !draft.title) { setSuggestion([]); return; }
    const current = ++version.current;
    const timer = window.setTimeout(() => void suggestTaskSteps(draft.title).then((steps) => {
      if (current === version.current) setSuggestion(steps ?? []);
    }), 600);
    return () => window.clearTimeout(timer);
  }, [complex, draft.title]);
  useEffect(() => {
    if (!settingsOpen) return;
    dateInputRef.current?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSettingsOpen(false); settingsButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [settingsOpen]);

  const changeRaw = (value: string) => {
    const parsed = parseTaskInput(value, date);
    setRaw(value); setDraft(parsed);
    const reminder = parsed.reminderAt ? new Date(parsed.reminderAt) : null;
    setReminderDateDraft(reminder ? `${reminder.getFullYear()}-${String(reminder.getMonth() + 1).padStart(2, '0')}-${String(reminder.getDate()).padStart(2, '0')}` : '');
    setReminderTimeDraft(reminder ? reminder.toTimeString().slice(0, 5) : '');
    if (parsed.confidence === 'partial') setSettingsOpen(true);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.targetDate) return;
    onAdd(draft); setRaw(''); setDraft(parseTaskInput('', date)); setSuggestion([]); setSettingsOpen(false);
  };
  const setRepeat = (value: string) => setDraft((current) => ({ ...current,
    repeatRule: value ? value as RepeatRule : null }));

  const todayKey = localDateKey(date);
  const updateReminder = (dateValue: string, timeValue: string) => {
    setReminderDateDraft(dateValue); setReminderTimeDraft(timeValue);
    setDraft((current) => ({ ...current, reminderAt: dateValue && timeValue
      ? new Date(`${dateValue}T${timeValue}`).toISOString() : null,
      confidence: dateValue && timeValue ? 'certain' : current.confidence }));
  };
  const summaries = [
    draft.targetDate !== todayKey ? formatTaskDate(draft.targetDate, todayKey) : '',
    draft.time ?? '', draft.reminderAt ? '已设置提醒' : '',
    draft.repeatRule ? repeatLabels[draft.repeatRule] : '',
  ].filter(Boolean);

  return <form ref={formRef} className="smart-add" onSubmit={submit}>
    <div className="smart-add-main"><input ref={inputRef} value={raw} maxLength={100} aria-label="任务内容"
      placeholder="你准备做点什么？" onChange={(event) => changeRaw(event.target.value)} />
      <button ref={settingsButtonRef} type="button" className="task-settings-toggle" aria-label="任务设置"
        title="任务设置" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
        <Icon name="settings" size={15} /></button>
      <button type="submit" aria-label="添加" title="添加任务"
        disabled={!draft.title.trim()}><span aria-hidden="true">＋</span></button></div>
    {(summaries.length > 0 || draft.confidence === 'partial') && <div className="task-meta-summary"
      aria-label="解析结果" aria-live="polite">{summaries.map((summary) => <span key={summary}>{summary}</span>)}
      {draft.confidence === 'partial' && <strong>提醒时间待设置</strong>}</div>}
    {settingsOpen && <fieldset className="task-add-settings"><legend>任务设置</legend>
      <label><span>计划日期</span><input ref={dateInputRef} aria-label="计划日期" type="date" value={draft.targetDate}
        onChange={(event) => setDraft({ ...draft,
          targetDate: event.target.value || localDateKey(date) })} /></label>
      <label><span>计划时间</span><input aria-label="计划时间" type="time" value={draft.time ?? ''}
        onChange={(event) => setDraft({ ...draft, time: event.target.value || null })} /></label>
      <div className="reminder-setting"><span>提醒时间</span><div className="reminder-inputs">
        <input aria-label="提醒日期" type="date" value={reminderDateDraft}
          onChange={(event) => updateReminder(event.target.value, reminderTimeDraft)} />
        <input aria-label="提醒时刻" type="time" value={reminderTimeDraft}
          onChange={(event) => updateReminder(reminderDateDraft, event.target.value)} />
        <button type="button" className="clear-reminder" onClick={() => { setReminderDateDraft(''); setReminderTimeDraft(''); setDraft({ ...draft, reminderAt: null }); }}>清除</button>
      </div><small>{draft.reminderAt ? '已设置提醒' : reminderDateDraft || reminderTimeDraft ? '请补齐日期和时间' : '未设置提醒'}</small></div>
      <label><span>重复规则</span><select aria-label="重复规则" value={draft.repeatRule ?? ''}
        onChange={(event) => setRepeat(event.target.value)}><option value="">不重复</option>
        <option value="daily">每天</option><option value="weekly">每周</option>
        <option value="weekdays">工作日</option></select>
        {draft.repeatRule && <small className="repeat-hint">完成本次后，将自动安排下一次</small>}</label>
    </fieldset>}
    {suggestion.length > 0 && <div className="split-suggestion" role="status">
      <span>看起来包含 {suggestion.length} 件事，要拆成步骤吗？</span>
      <button type="button" onClick={() => { setDraft({ ...draft, steps: suggestion.map((title) =>
        ({ id: crypto.randomUUID(), title, completed: false })) }); setSuggestion([]); }}>拆成 {suggestion.length} 步</button>
      <button type="button" onClick={() => setSuggestion([])}>保持一项</button>
    </div>}
  </form>;
}
