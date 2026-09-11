import { useEffect, useRef, useState } from 'react';
import type { RepeatRule, TaskDraft } from '../../types/task';
import { suggestTaskSteps } from '../../utils/aiClient';
import { parseTaskInput } from '../../utils/taskParser';

export function AddTaskControl({ date, onAdd }: { date: Date; onAdd: (draft: TaskDraft) => void }) {
  const [raw, setRaw] = useState('');
  const [draft, setDraft] = useState(() => parseTaskInput('', date));
  const [suggestion, setSuggestion] = useState<string[]>([]);
  const version = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const complex = /[：:、；;]/.test(raw) || (raw.match(/[，,]/g)?.length ?? 0) >= 2;
  useEffect(() => {
    if (!complex || !draft.title) { setSuggestion([]); return; }
    const current = ++version.current;
    const timer = window.setTimeout(() => void suggestTaskSteps(draft.title).then((steps) => {
      if (current === version.current) setSuggestion(steps ?? []);
    }), 600);
    return () => window.clearTimeout(timer);
  }, [complex, draft.title]);

  const changeRaw = (value: string) => { setRaw(value); setDraft(parseTaskInput(value, date)); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onAdd(draft); setRaw(''); setDraft(parseTaskInput('', date)); setSuggestion([]);
  };
  const setRepeat = (value: string) => setDraft((current) => ({ ...current,
    repeatRule: value ? value as RepeatRule : null }));

  return <form className="smart-add" onSubmit={submit}>
    <div className="smart-add-main"><input ref={inputRef} value={raw} maxLength={100} aria-label="任务内容"
      placeholder="你准备做点什么？" onChange={(event) => changeRaw(event.target.value)} />
      <button type="submit" disabled={!draft.title.trim()}>添加</button></div>
    {raw && <div className="parse-tags" aria-label="解析结果">
      <button type="button" title="任务标题" onClick={() => { inputRef.current?.focus(); inputRef.current?.select(); }}>{draft.title}</button>
      <label>日期<input aria-label="计划日期" type="date" value={draft.targetDate}
        onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} /></label>
      <label>时间<input aria-label="计划时间" type="time" value={draft.time ?? ''}
        onChange={(event) => setDraft({ ...draft, time: event.target.value || null })} /></label>
      <label>提醒<input aria-label="提醒时间" type="datetime-local"
        value={draft.reminderAt ? new Date(new Date(draft.reminderAt).getTime()
          - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''}
        onChange={(event) => setDraft({ ...draft, reminderAt: event.target.value
          ? new Date(event.target.value).toISOString() : null, confidence: 'certain' })} /></label>
      <label>重复<select aria-label="重复规则" value={draft.repeatRule ?? ''}
        onChange={(event) => setRepeat(event.target.value)}><option value="">不重复</option>
        <option value="daily">每天</option><option value="weekly">每周</option>
        <option value="weekdays">工作日</option></select></label>
      {draft.confidence === 'partial' && <span className="parse-warning">提醒时间待设置</span>}
    </div>}
    {suggestion.length > 0 && <div className="split-suggestion" role="status">
      <span>看起来包含 {suggestion.length} 件事，要拆成步骤吗？</span>
      <button type="button" onClick={() => { setDraft({ ...draft, steps: suggestion.map((title) =>
        ({ id: crypto.randomUUID(), title, completed: false })) }); setSuggestion([]); }}>拆成 {suggestion.length} 步</button>
      <button type="button" onClick={() => setSuggestion([])}>保持一项</button>
    </div>}
  </form>;
}
