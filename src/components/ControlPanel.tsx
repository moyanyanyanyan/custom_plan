import { useState } from 'react';
import { AvatarArt } from './AvatarArt';
import { Icon } from './Icon';
import { ExperimentList } from './ExperimentList';
import { CardCollection } from './CardCollection';
import { completedCount, experiments } from '../constants/preview';
import { desktopCommand, isDesktop } from '../utils/desktop';
import { generateCardFromTasks } from '../utils/cardGenerator';
import { addCard, canGenerateToday } from '../utils/cardStorage';
import './panel.css';
import './experiments.css';
import './collection.css';

/** 仅窗口按钮可交互，业务区域完全由固定预览数据构成。 */
export function ControlPanel() {
  const [error, setError] = useState('');
  const [cardsGenerated, setCardsGenerated] = useState(false);
  const windowAction = (command: 'hide_panel' | 'exit_app' | 'drag_panel') => {
    void desktopCommand(command).catch((reason) => setError(String(reason)));
  };

  const handleGenerateCard = () => {
    const card = generateCardFromTasks(experiments);
    if (!card) {
      alert('今日还没有完成任务，先完成一项再启动发明机吧');
      return;
    }
    if (!canGenerateToday()) {
      alert('今天已经获得过卡牌了，明天再来吧');
      return;
    }
    addCard(card);
    setCardsGenerated(true);
    alert(`获得新卡牌：${card.name}`);
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
        <div className="progress-label"><span>今日研究进度</span><strong>{completedCount}<small> / {experiments.length}</small></strong></div>
        <div className="progress-track" role="progressbar" aria-label="今日研究进度" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={experiments.length}>
          <span style={{ width: `${completedCount / experiments.length * 100}%` }} />
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
        <div><i className="metric-dot stagnant" /><span>停滞能量</span><strong>{experiments.length - completedCount}</strong></div>
        <div className="slime-metric"><Icon name="slime" size={20} /><span>史莱姆图鉴</span><Icon name="arrow" size={16} /></div>
      </div>
      <ExperimentList />
    </section>
    <button className="invention-button static-button" onClick={handleGenerateCard}>
      <span className="machine-symbol"><Icon name="flask" size={28} /></span>
      <span><strong>启动今日发明机</strong><small>让今天的小事，变成不必要的大发明</small></span>
      <Icon name="arrow" size={25} />
    </button>
    <footer className="panel-footer"><span><i />研究所运行正常</span><span>认真生活 · 胡乱发明</span><span>VOL. 001</span></footer>
    <CardCollection />
  </main>;
}

