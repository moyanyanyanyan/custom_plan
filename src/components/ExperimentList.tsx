import { useState, useEffect } from 'react';
import type { Experiment } from '../types/experiment';
import { Icon } from './Icon';
import { isDemoMode } from '../utils/demoMode';
import { todayTasks, addTask, toggleTask, removeTask, onTaskChange } from '../utils/taskStore';
import { experiments as previewExperiments } from '../constants/preview';

/** 中央焦点固定，真实任务可交互；demo 模式回退预览。 */
export function ExperimentList() {
  const [tasks, setTasks] = useState<Experiment[]>([]);

  useEffect(() => {
    const load = () => setTasks(isDemoMode() ? previewExperiments : todayTasks());
    load();
    return onTaskChange(load);
  }, []);

  const handleAdd = () => {
    const name = window.prompt('输入实验任务名称：');
    if (!name || !name.trim()) return;
    addTask(name.trim(), 15);
  };

  return <section className="experiments" aria-labelledby="experiments-title">
    <header><h3 id="experiments-title">今日实验 <span>EXPERIMENTS</span></h3><span className="experiment-group">实验组 A <Icon name="arrow" size={15} /></span></header>
    <div className="task-belt">
      <span className="belt-arrow up" aria-hidden="true">⌃</span>
      {tasks.length === 0 && <p className="empty-tasks">暂无任务，点击下方“添加任务”开始实验</p>}
      {tasks.map((task, index) => <article key={task.id}
        className={`task-pill depth-${Math.abs(index - Math.max(0, Math.floor(tasks.length / 2)))} ${index === Math.floor(tasks.length / 2) ? 'focused' : ''} ${task.completed ? 'completed' : ''}`}
        onClick={() => !isDemoMode() && toggleTask(task.id)}
        title={!isDemoMode() ? '点击切换完成状态' : undefined}
      >
        <span className={`task-icon icon-${task.icon}`}><Icon name={task.completed ? 'check' : task.icon} size={index === Math.floor(tasks.length / 2) ? 34 : 22} /></span>
        <div className="task-description"><h4>{task.name}</h4>{index === Math.floor(tasks.length / 2) && <p><Icon name="clock" size={15} />预计用时 {task.minutes} 分钟</p>}</div>
        <span className="task-state">{task.completed ? '✓ 已完成' : '○ 未完成'}</span>
        {!isDemoMode() && <button className="task-remove" onClick={(e) => { e.stopPropagation(); removeTask(task.id); }} aria-label="删除任务">×</button>}
      </article>)}
      <span className="belt-arrow down" aria-hidden="true">⌄</span>
    </div>
    <p className="belt-caption">今日的小小行动，都是发明的原料 {!isDemoMode() && <span>· 点击任务可标记完成</span>}</p>
    {!isDemoMode() && <button className="static-button add-task" onClick={handleAdd}><span>＋</span> 添加任务</button>}
  </section>;
}
