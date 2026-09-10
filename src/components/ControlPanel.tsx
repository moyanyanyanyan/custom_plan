import { useState } from 'react';
import { AvatarArt } from './AvatarArt';
import { Icon } from './Icon';
import { ExperimentList } from './ExperimentList';
import { useTasks } from '../hooks/useTasks';
import { desktopCommand, isDesktop } from '../utils/desktop';
import './panel.css';
import './experiments.css';

/** 控制面板：任务来自本地存储数据层，窗口操作仍走原生命令。 */
export function ControlPanel() {
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const { tasks, add, toggle, remove } = useTasks();
  const completed = tasks.filter((task) => task.completed).length;
  const windowAction = (command: 'hide_panel' | 'exit_app' | 'drag_panel') => {
    void desktopCommand(command).catch((reason) => setError(String(reason)));
  };
  const submitTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    add({ name, icon: 'flask', minutes: 10, completed: false, group: 'A' });
    setDraft('');
  };
  return <main className="panel-shell">
    <header className="brand-bar panel-drag-area" title="按住此处拖动面板" onPointerDown={(event) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
      windowAction('drag_panel');
    }}>
      <div className="brand"><span className="brand-mark">i<span>▲</span></span>
        <div><h1>离谱发明所</h1><p>INSTITUTE OF ABSURD INVENTIONS</p></div>
      </div>
      <div className="window-actions"><span className="preview-label">界面预览</span>
        <button disabled={!isDesktop} onClick={() => windowAction('hide_panel')} title="收起面板" aria-label="收起面板"><Icon name="minus" size={17} /></button>
        <button disabled={!isDesktop} onClick={() => windowAction('exit_app')} title="退出应用" aria-label="退出应用"><Icon name="power" size={16} /></button>
      </div>
    </header>
    {error && <p role="alert" className="window-error">窗口操作失败：{error}</p>}
    <section className="overview" aria-label="研究所概况">
      <div className="profile-avatar"><AvatarArt /><span>RESEARCHER / 001</span></div>
      <div className="profile-info">
        <div className="identity"><h2>墨言</h2><span>代理所长</span></div>
        <div className="progress-label"><span>今日研究进度</span><strong>{completed}<small> / {tasks.length}</small></strong></div>
        <div className="progress-track" role="progressbar" aria-label="今日研究进度" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={tasks.length}>
          <span style={{ width: tasks.length ? `${completed / tasks.length * 100}%` : '0%' }} />
        </div>
        <p className="assistant-message"><span className="signal-dot" />检测到新的行动余波。<Icon name="arrow" size={15} /></p>
      </div>
      <div className="collection" aria-label="发明卡牌 12 张"><span className="collection-orbit" />
        <span className="eyebrow">ARCHIVE / 001</span><h3>发明卡牌</h3>
        <div><strong>12</strong><Icon name="arrow" /></div><span className="collection-caption">收藏每一次认真生活</span>
      </div>
    </section>
    <section className="console" aria-labelledby="console-title">
      <div className="console-heading">
        <div><span className="eyebrow">DAILY RESEARCH</span><h2 id="console-title">今日控制台</h2></div>
        <form className="add-form" onSubmit={submitTask}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="新实验名称…" aria-label="新实验名称" maxLength={30} />
          <button type="submit" className="add-task" disabled={!draft.trim()}>＋ 添加任务</button>
        </form>
      </div>
      <div className="metrics">
        <div><i className="metric-dot stable" /><span>稳定余波</span><strong>{completed}</strong></div>
        <div><i className="metric-dot stagnant" /><span>停滞能量</span><strong>{tasks.length - completed}</strong></div>
        <div className="slime-metric"><Icon name="slime" size={20} /><span>史莱姆图鉴</span><Icon name="arrow" size={16} /></div>
      </div>
      <ExperimentList tasks={tasks} onToggle={toggle} onRemove={remove} />
    </section>
    <button className="invention-button static-button" disabled>
      <span className="machine-symbol"><Icon name="flask" size={28} /></span>
      <span><strong>启动今日发明机</strong><small>让今天的小事，变成不必要的大发明</small></span>
      <Icon name="arrow" size={25} />
    </button>
    <footer className="panel-footer"><span><i />研究所运行正常</span><span>认真生活 · 胡乱发明</span><span>VOL. 001</span></footer>
  </main>;
}
