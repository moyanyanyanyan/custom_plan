import { useEffect, useRef, useState } from 'react';

export function AddTaskControl({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const close = () => { setDraft(''); setOpen(false); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    close();
  };

  if (!open) return <button type="button" className="add-task" onClick={() => setOpen(true)}>
    ＋ 添加任务
  </button>;
  return <form className="add-form" onSubmit={submit}>
    <input ref={inputRef} value={draft} maxLength={30} aria-label="任务内容"
      placeholder="输入任务内容…" onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => { if (event.key === 'Escape') close(); }} />
    <button type="submit" className="add-task" disabled={!draft.trim()}>添加</button>
    <button type="button" className="add-cancel" onClick={close}>取消</button>
  </form>;
}
