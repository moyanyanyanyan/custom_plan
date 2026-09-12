import { useState } from 'react';
import { AvatarArt } from './AvatarArt';
import { Icon } from './Icon';
import { ExperimentList } from './ExperimentList';
import { CardRevealModal } from './CardRevealModal';
import { SettingsPanel } from './settings/SettingsPanel';
import { AddTaskControl } from './tasks/AddTaskControl';
import { ArchiveModal } from './cards/ArchiveModal';
import { SlimeArchive } from './slimes/SlimeArchive';
import { useTasks } from '../hooks/useTasks';
import { desktopCommand, isDesktop } from '../utils/desktop';
import { useCardGeneration } from '../hooks/useCardGeneration';
import { useSlimes } from '../hooks/useSlimes';
import { useAppData } from '../hooks/useAppData';
import { useSettings } from '../hooks/useSettings';
import { playCompletionSound } from '../utils/feedback';
import './panel.css';
import './experiments.css';
import './collection.css';
import './reveal.css';

/** 控制面板统一持有任务状态，并将真实完成任务交给卡牌生成流程。 */
export function ControlPanel() {
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [slimesOpen, setSlimesOpen] = useState(false);
  const [energyToast, setEnergyToast] = useState(false);
  const { tasks, add, toggle, remove, completeHistorical } = useTasks();
  const completedCount = tasks.filter((t) => t.completed).length;
  const generation = useCardGeneration(tasks);
  const slimes = useSlimes();
  const { error: storageError, saveStatus, retrySave } = useAppData();
  const { settings } = useSettings();

  const windowAction = (command: 'hide_panel' | 'exit_app' | 'drag_panel') => {
    void desktopCommand(command).catch((reason) => setError(String(reason)));
  };

  const handleToggle = (id: string) => {
    const completing = !tasks.find((task) => task.id === id)?.completed;
    toggle(id);
    if (!completing) return;
    playCompletionSound(settings.soundEnabled);
    setEnergyToast(true);
    window.setTimeout(() => setEnergyToast(false), 1100);
  };

  const handleGenerateCard = async () => {
    if (generation.state !== 'ready') return;
    await generation.generate();
  };

  const pendingSlimes = slimes.filter((slime) => !slime.containedAt).length;
  const assistantCopy = generation.state === 'completed' ? '今日发明已经归档，明天继续研究。'
    : pendingSlimes ? `检测到 ${pendingSlimes} 只过夜史莱姆仍在游荡。`
      : !tasks.length ? '先登记一项今天想完成的小事吧。'
        : generation.state === 'ready' ? '研究数据充足，今日发明机已经就绪。'
          : `还差 ${generation.remaining} 份稳定余波即可启动发明机。`;
  const machineCopy = generation.state === 'generating' ? '发明机运转中…'
    : generation.state === 'completed' ? '今日发明已完成'
      : '启动今日发明机';

  return (
    <>
      <main className="panel-shell">
    <header className="brand-bar panel-drag-area" title="按住此处拖动面板" onPointerDown={(event) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
      windowAction('drag_panel');
    }}>
      <div className="brand"><span className="brand-mark">i<span>▲</span></span>
        <div><h1>离谱发明所</h1><p>INSTITUTE OF ABSURD INVENTIONS</p></div>
      </div>
      <div className="window-actions"><span className="preview-label">界面预览</span>
        <button onClick={() => setSettingsOpen(true)} title="研究所设置" aria-label="研究所设置"><Icon name="settings" size={16} /></button>
        <button disabled={!isDesktop} onClick={() => windowAction('hide_panel')} title="收起面板" aria-label="收起面板"><Icon name="minus" size={17} /></button>
        <button disabled={!isDesktop} onClick={() => windowAction('exit_app')} title="退出应用" aria-label="退出应用"><Icon name="power" size={16} /></button>
      </div>
    </header>
    {(error || storageError || generation.warning || saveStatus === 'pending') &&
      <div role="alert" className="window-error">
        <span>{error || storageError || generation.warning || '数据保存中…'}</span>
        {saveStatus === 'failed' && <button onClick={() => void retrySave()}>重试保存</button>}
      </div>}
    <section className="overview" aria-label="研究所概况">
      <div className="profile-avatar"><AvatarArt /><span>RESEARCHER / 001</span></div>
      <div className="profile-info">
        <div className="identity"><h2>墨言</h2><span>代理所长</span></div>
        <div className="progress-label"><span>今日研究进度</span><strong>{completedCount}<small> / {tasks.length}</small></strong></div>
        <div className="progress-track" role="progressbar" aria-label="今日研究进度" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={tasks.length}>
          <span style={{ width: `${tasks.length ? completedCount / tasks.length * 100 : 0}%` }} />
        </div>
        <p className="assistant-message"><span className="signal-dot" />{assistantCopy}</p>
      </div>
      <button className="collection" aria-label={`打开发明档案馆，共 ${generation.cards.length} 张`}
        onClick={() => setArchiveOpen(true)}><span className="collection-orbit" />
        <span className="eyebrow">ARCHIVE / 001</span><h3>发明卡牌</h3>
        <div><strong>{generation.cards.length}</strong><Icon name="arrow" /></div><span className="collection-caption">收藏每一次认真生活</span>
      </button>
    </section>
    <section className="console" aria-labelledby="console-title">
      <div className="console-heading">
        <div><span className="eyebrow">DAILY RESEARCH</span><h2 id="console-title">今日控制台</h2></div>
        <AddTaskControl onAdd={add} />
      </div>
      <div className="metrics">
        <div><i className="metric-dot stable" /><span>稳定余波</span><strong>{completedCount}</strong></div>
        <div><i className="metric-dot stagnant" /><span>停滞能量</span><strong>{tasks.length - completedCount}</strong></div>
        <button className="slime-metric" onClick={() => setSlimesOpen(true)}><Icon name="slime" size={20} />
          <span>史莱姆图鉴</span><strong>{pendingSlimes}/{slimes.length}</strong></button>
      </div>
      <ExperimentList tasks={tasks} onToggle={handleToggle} onRemove={remove} />
    </section>
    <button className={`invention-button ${generation.state}`} onClick={handleGenerateCard}
      disabled={generation.state !== 'ready'}>
      <span className="machine-symbol"><Icon name="flask" size={28} /></span>
      <strong>{machineCopy}</strong>
      <Icon name="arrow" size={25} />
    </button>
    {energyToast && <div className="energy-toast" role="status">稳定余波 +1</div>}
    <CardRevealModal card={generation.revealedCard} open={!!generation.revealedCard}
      onClose={() => generation.setRevealedCard(null)} />
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    <ArchiveModal open={archiveOpen} tasks={tasks} onClose={() => setArchiveOpen(false)} />
    <SlimeArchive open={slimesOpen} slimes={slimes} onContain={completeHistorical}
      onClose={() => setSlimesOpen(false)} />
      </main>
    </>
  );
}
