import { Icon } from './Icon';
import type { Experiment } from '../types/experiment';

/** 纵向胶囊任务带：中央任务放大聚焦；点击切换完成，聚焦项可删除。 */
export function ExperimentList({ tasks, onToggle, onRemove }: {
  tasks: Experiment[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const center = Math.max(0, Math.floor((tasks.length - 1) / 2));
  return <section className="experiments" aria-labelledby="experiments-title">
    <header><h3 id="experiments-title">今日实验 <span>EXPERIMENTS</span></h3><span className="experiment-group">实验组 A <Icon name="arrow" size={15} /></span></header>
    <div className="task-belt">
      <span className="belt-arrow up" aria-hidden="true">⌃</span>
      {tasks.map((task, index) => {
        const focused = index === center;
        return <div key={task.id} role="button" tabIndex={0} aria-pressed={task.completed}
          onClick={() => onToggle(task.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onToggle(task.id);
            }
          }}
          className={`task-pill depth-${Math.abs(index - center)} ${focused ? 'focused' : ''} ${task.completed ? 'completed' : ''}`}>
          <span className={`task-icon icon-${task.icon}`}><Icon name={task.completed ? 'check' : task.icon} size={focused ? 34 : 22} /></span>
          <span className="task-description"><h4>{task.name}</h4>{focused && <p><Icon name="clock" size={15} />预计用时 {task.minutes} 分钟</p>}</span>
          <span className="task-state">{task.completed ? '✓ 已完成' : '○ 未完成'}</span>
          {focused && <button type="button" className="task-delete" aria-label={`删除 ${task.name}`}
            onClick={(event) => { event.stopPropagation(); onRemove(task.id); }}>×</button>}
        </div>;
      })}
      {tasks.length === 0 && <p className="belt-empty">今天还没有实验，在上方添加一个吧</p>}
      <span className="belt-arrow down" aria-hidden="true">⌄</span>
    </div>
    <p className="belt-caption">今日的小小行动，都是发明的原料 <span>· 点击任务切换完成</span></p>
  </section>;
}
