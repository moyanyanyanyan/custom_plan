import { useState } from 'react';
import type { Task, TaskStep } from '../../types/task';

export function TaskDetails({ task, dateKey, onPatch, onReschedule }: {
  task: Task; dateKey: string; onPatch: (changes: Partial<Task>) => void;
  onReschedule: (date: string, changes?: Partial<Task>) => void;
}) {
  const [stepTitle, setStepTitle] = useState('');
  const updateStep = (id: string, changes: Partial<TaskStep>) => onPatch({
    steps: task.steps.map((step) => step.id === id ? { ...step, ...changes } : step),
  });
  const addStep = () => {
    const title = stepTitle.trim();
    if (!title) return;
    onPatch({ steps: [...task.steps, { id: crypto.randomUUID(), title, completed: false }] });
    setStepTitle('');
  };
  return <div className="task-details">
    <label>任务名称<input value={task.name} maxLength={100}
      onChange={(event) => onPatch({ name: event.target.value })} /></label>
    <label>计划日期<input type="date" value={dateKey}
      onChange={(event) => onReschedule(event.target.value)} /></label>
    <label>计划时间<input type="time" value={task.scheduledTime ?? ''}
      onChange={(event) => onPatch({ scheduledTime: event.target.value || null })} /></label>
    <label>备注<textarea value={task.notes} placeholder="补充一点上下文…"
      onChange={(event) => onPatch({ notes: event.target.value })} /></label>
    <div className="steps" aria-label="任务步骤">{task.steps.map((step) =>
      <div key={step.id}><input type="checkbox" checked={step.completed}
        aria-label={`完成步骤 ${step.title}`} onChange={(event) => updateStep(step.id,
          { completed: event.target.checked })} />
        <input value={step.title} aria-label="步骤内容"
          onChange={(event) => updateStep(step.id, { title: event.target.value })} />
        <button type="button" aria-label={`删除步骤 ${step.title}`}
          onClick={() => onPatch({ steps: task.steps.filter((item) => item.id !== step.id) })}>×</button></div>)}
      <div><input value={stepTitle} aria-label="新步骤" placeholder="添加一个步骤"
        onChange={(event) => setStepTitle(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addStep(); } }} />
        <button type="button" onClick={addStep}>添加</button></div>
    </div>
  </div>;
}
