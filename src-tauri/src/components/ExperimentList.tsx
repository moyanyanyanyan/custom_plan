import { experiments } from '../constants/preview';
import { Icon } from './Icon';

/** 中央焦点固定，首版仅展示任务带的视觉层次，不模拟可用的任务操作。 */
export function ExperimentList() {
  return <section className="experiments" aria-labelledby="experiments-title">
    <header><h3 id="experiments-title">今日实验 <span>EXPERIMENTS</span></h3><span className="experiment-group">实验组 A <Icon name="arrow" size={15} /></span></header>
    <div className="task-belt">
      <span className="belt-arrow up" aria-hidden="true">⌃</span>
      {experiments.map((task, index) => <article key={task.id}
        className={`task-pill depth-${Math.abs(index - 2)} ${index === 2 ? 'focused' : ''} ${task.completed ? 'completed' : ''}`}>
        <span className={`task-icon icon-${task.icon}`}><Icon name={task.completed ? 'check' : task.icon} size={index === 2 ? 34 : 22} /></span>
        <div className="task-description"><h4>{task.name}</h4>{index === 2 && <p><Icon name="clock" size={15} />预计用时 {task.minutes} 分钟</p>}</div>
        <span className="task-state">{task.completed ? '✓ 已完成' : '○ 未完成'}</span>
      </article>)}
      <span className="belt-arrow down" aria-hidden="true">⌄</span>
    </div>
    <p className="belt-caption">今日的小小行动，都是发明的原料 <span>· 静态预览</span></p>
  </section>;
}
