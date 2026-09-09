import { useState, useEffect } from 'react';
import type { Experiment } from '../types/experiment';
import type { InventionCard } from '../types/card';
import { AvatarArt } from './AvatarArt';
import { Icon } from './Icon';
import { ExperimentList } from './ExperimentList';
import { CardCollection } from './CardCollection';
import { CardRevealModal } from './CardRevealModal';
import { desktopCommand, isDesktop } from '../utils/desktop';
import { generateCardFromTasks, remainingTasksForCard } from '../utils/cardGenerator';
import { addCard, canGenerateToday } from '../utils/cardStorage';
import { generateAICopy } from '../utils/stepfun';
import { generateCardImage } from '../utils/cardImage';
import { isDemoMode } from '../utils/demoMode';
import { todayTasks, onTaskChange } from '../utils/taskStore';
import { experiments as previewExperiments } from '../constants/preview';
import './panel.css';
import './experiments.css';
import './collection.css';
import './reveal.css';

/** 仅窗口按钮可交互，业务区域完全由真实任务数据构成；demo 模式回退预览。 */
export function ControlPanel() {
  const [error, setError] = useState('');
  const [inventing, setInventing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [revealedCard, setRevealedCard] = useState<InventionCard | null>(null);
  const [tasks, setTasks] = useState<Experiment[]>([]);

  useEffect(() => {
    const load = () => setTasks(isDemoMode() ? previewExperiments : todayTasks());
    load();
    return onTaskChange(load);
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const remaining = remainingTasksForCard(tasks);

  const windowAction = (command: 'hide_panel' | 'exit_app' | 'drag_panel') => {
    void desktopCommand(command).catch((reason) => setError(String(reason)));
  };

  const handleGenerateCard = async () => {
    if (inventing) return;
    if (remaining > 0) {
      alert(`今日研究进度 ${completedCount}/${tasks.length}，还差 ${remaining} 个任务完成才能启动发明机`);
      return;
    }
    if (!canGenerateToday() && !isDemoMode()) {
      alert('今天已经获得过卡牌了，明天再来吧');
      return;
    }
    setInventing(true);
    try {
      const base = generateCardFromTasks(tasks);
      if (!base) return;
      const ai = await generateAICopy(base.sourceTasks);
      const named: InventionCard = ai
        ? { ...base, name: ai.name, description: ai.description, stackKey: ai.name }
        : base;
      const art = await generateCardImage(named);
      const created = { ...named, imagePath: art.imagePath };
      addCard(created);
      setRevealedCard(created);
    } finally {
      setInventing(false);
    }
  };

  return (
    <>
      <main className="panel-shell" key={refreshKey}>
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
        <div className="progress-label"><span>今日研究进度</span><strong>{completedCount}<small> / {tasks.length}</small></strong></div>
        <div className="progress-track" role="progressbar" aria-label="今日研究进度" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={tasks.length}>
          <span style={{ width: `${tasks.length ? completedCount / tasks.length * 100 : 0}%` }} />
        </div>
        <p className="assistant-message"><span className="signal-dot" />检测到新的行动余波。<Icon name="arrow" size={15} /></p>
      </div>
      <div className="collection" aria-label="发明卡牌 12 张"><span className="collection-orbit" />
        <span className="eyebrow">ARCHIVE / 001</span><h3>发明卡牌</h3>
        <div><strong>12</strong><Icon name="arrow" /></div><span className="collection-caption">收藏每一次认真生活</span>
      </div>
    </section>
    <section className="console" aria-labelledby="console-title">
      <div className="console-heading"><div><span className="eyebrow">DAILY RESEARCH</span><h2 id="console-title">今日控制台</h2></div>
        <button className="static-button add-task" disabled><span>＋</span> 添加任务</button>
      </div>
      <div className="metrics">
        <div><i className="metric-dot stable" /><span>稳定余波</span><strong>{completedCount}</strong></div>
        <div><i className="metric-dot stagnant" /><span>停滞能量</span><strong>{tasks.length - completedCount}</strong></div>
        <div className="slime-metric"><Icon name="slime" size={20} /><span>史莱姆图鉴</span><Icon name="arrow" size={16} /></div>
      </div>
      <ExperimentList />
    </section>
    <button className={`invention-button static-button${inventing ? ' inventing' : ''}`} onClick={handleGenerateCard} disabled={inventing || remaining > 0}>
      <span className="machine-symbol"><Icon name="flask" size={28} /></span>
      <span>
        <strong>{inventing ? '发明机运转中…' : '启动今日发明机'}</strong>
        <small>{inventing ? 'AI 正在命名与绘制卡牌，通常需要 1 分钟左右' : remaining > 0 ? `还差 ${remaining} 个任务完成才能启动发明机` : '让今天的小事，变成不必要的大发明'}</small>
      </span>
      <Icon name="arrow" size={25} />
    </button>
    <footer className="panel-footer"><span><i />研究所运行正常</span><span>认真生活 · 胡乱发明</span><span>VOL. 001</span></footer>
    <CardCollection />
    <CardRevealModal card={revealedCard} open={!!revealedCard} onClose={() => { setRevealedCard(null); setRefreshKey((k) => k + 1); }} />
      </main>
    </>
  );
}
