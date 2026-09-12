import { useEffect, useRef, useState } from 'react';
import { AvatarArt } from './AvatarArt';
import { Icon } from './Icon';
import { CardRevealModal } from './CardRevealModal';
import { SettingsPanel } from './settings/SettingsPanel';
import { TodayTaskBoard } from './tasks/TodayTaskBoard';
import { ArchiveModal } from './cards/ArchiveModal';
import { useTasks } from '../hooks/useTasks';
import { desktopCommand, isDesktop, setPanelMode } from '../utils/desktop';
import { useCardGeneration } from '../hooks/useCardGeneration';
import { useSlimes } from '../hooks/useSlimes';
import { useAppData } from '../hooks/useAppData';
import { useSettings } from '../hooks/useSettings';
import { useCurrentDate } from '../hooks/useCurrentDate';
import { useTaskReminders } from '../hooks/useTaskReminders';
import { playCompletionSound, playTaskAddedSound } from '../utils/feedback';
import { calculateCardStreak } from '../utils/streak';
import { OnboardingGuide } from './onboarding/OnboardingGuide';
import { loadJson, saveJson } from '../utils/storage';
import './panel.css';
import './collection.css';
import './reveal.css';

/** 控制面板统一持有任务状态，并将真实完成任务交给卡牌生成流程。 */
export function ControlPanel() {
  const [guideOpen, setGuideOpen] = useState(() => !loadJson('onboarding-seen', false));
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [energyToast, setEnergyToast] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [recentlyAddedTaskId, setRecentlyAddedTaskId] = useState<string | null>(null);
  const [addedTaskMessage, setAddedTaskMessage] = useState('');
  const addedFeedbackTimer = useRef<number | undefined>(undefined);
  const { tasks, laterTasks, dateKey, add, toggle, remove, patch, reschedule,
    moveToToday, completeHistorical, discardHistorical } = useTasks();
  const completedCount = tasks.filter((t) => t.completed).length;
  const generation = useCardGeneration(tasks);
  const slime = useSlimes();
  const { error: storageError, saveStatus, retrySave } = useAppData();
  const { settings, save } = useSettings();
  useEffect(() => { void setPanelMode(settings.panelMode); }, [settings.panelMode]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key.toLowerCase() !== 'm' || !event.ctrlKey || !event.shiftKey
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      event.preventDefault();
      const panelMode = settings.panelMode === 'compact' ? 'standard' : 'compact';
      void save({ ...settings, panelMode });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, settings]);
  const { now } = useCurrentDate();
  const { reminderError } = useTaskReminders();
  const streak = calculateCardStreak(generation.cards, now);
  useEffect(() => () => window.clearTimeout(addedFeedbackTimer.current), []);

  const windowAction = (command: 'minimize_panel' | 'exit_app' | 'drag_panel') => {
    void desktopCommand(command).catch((reason) => setError(String(reason)));
  };
  const finishGuide = () => { saveJson('onboarding-seen', true); setGuideOpen(false); };
  const replayGuide = () => { setSettingsOpen(false); setGuideOpen(true); };

  const handleToggle = (id: string) => {
    const completing = !tasks.find((task) => task.id === id)?.completed;
    toggle(dateKey, id);
    if (!completing) return;
    playCompletionSound(settings.soundEnabled);
    setEnergyToast(true);
    window.setTimeout(() => setEnergyToast(false), 1100);
  };

  const handleAdd = (draft: Parameters<typeof add>[0]) => {
    const taskId = add(draft);
    if (!taskId) return;
    window.clearTimeout(addedFeedbackTimer.current);
    setRecentlyAddedTaskId(taskId);
    setAddedTaskMessage(`已添加任务：${draft.title.trim()}`);
    playTaskAddedSound(settings.soundEnabled);
    addedFeedbackTimer.current = window.setTimeout(() => {
      setRecentlyAddedTaskId(null); setAddedTaskMessage('');
    }, 1200);
  };

  const handleGenerateCard = async () => {
    if (generation.state !== 'ready') return;
    await generation.generate();
  };

  const pendingSlimes = slime.meals.length;
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
      <main className={`panel-shell panel-mode-${settings.panelMode}`}>
    <header className="brand-bar panel-drag-area" title="按住此处拖动面板" onPointerDown={(event) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
      windowAction('drag_panel');
    }}>
      <div className="brand"><span className="brand-mark">i<span>▲</span></span>
        <div><h1>离谱发明所</h1><p>INSTITUTE OF ABSURD INVENTIONS</p></div>
      </div>
      <div className="window-actions"><span className="preview-label">界面预览</span>
        <button data-guide="settings" onClick={() => setSettingsOpen(true)} title="研究所设置" aria-label="研究所设置"><Icon name="settings" size={16} /></button>
        <button disabled={!isDesktop} onClick={() => windowAction('minimize_panel')} title="最小化面板" aria-label="最小化面板"><Icon name="minus" size={17} /></button>
        <button disabled={!isDesktop} onClick={() => windowAction('exit_app')} title="退出应用" aria-label="退出应用"><Icon name="power" size={16} /></button>
      </div>
    </header>
    {saveStatus === 'pending' && <div className="save-status" role="status"><i />正在保存</div>}
    {(error || storageError || reminderError || generation.warning) &&
      <div role="alert" className="window-error">
        <span>{error || storageError || reminderError || generation.warning}</span>
        {saveStatus === 'failed' && <button onClick={() => void retrySave()}>重试保存</button>}
      </div>}
    <section className="overview" aria-label="研究所概况">
      <div className="profile-avatar"><AvatarArt /><span>RESEARCHER / 001</span></div>
      <div className="profile-info">
        <div className="identity"><h2>{settings.username}</h2>{streak > 0 && <b className="streak-badge">🔥 坚持 {streak} 天</b>}<span>代理所长</span></div>
        <div className="progress-label"><span>今日研究进度</span><strong>{completedCount}<small> / {tasks.length}</small></strong></div>
        <div className="progress-track" role="progressbar" aria-label="今日研究进度" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={tasks.length}>
          <span style={{ width: `${tasks.length ? completedCount / tasks.length * 100 : 0}%` }} />
        </div>
        <p className="assistant-message"><span className="signal-dot" />{assistantCopy}</p>
      </div>
      <button data-guide="collection" className="collection secondary-content" aria-label={`打开发明档案馆，共 ${generation.cards.length} 张`}
        onClick={() => setArchiveOpen(true)}><span className="collection-orbit" />
        <span className="eyebrow">ARCHIVE / 001</span><h3>发明卡牌</h3>
        <div><strong>{generation.cards.length}</strong><Icon name="arrow" /></div><span className="collection-caption">收藏每一次认真生活</span>
      </button>
    </section>
    <div className="today-board-shell" data-guide="task-list"><TodayTaskBoard tasks={tasks} laterTasks={laterTasks} dateKey={dateKey}
      date={now} focusTaskId={focusedTaskId} recentlyAddedTaskId={recentlyAddedTaskId}
      slime={slime} onAdd={handleAdd}
      onToggle={(date, id) => date === dateKey ? handleToggle(id) : toggle(date, id)}
      onRemove={remove} onPatch={patch} onReschedule={reschedule} onMoveToday={moveToToday}
      onSlimeComplete={completeHistorical} onSlimeDiscard={discardHistorical}
      onSlimeFocus={(date, id) => {
        const reminderAt = new Date(Date.now() + 5 * 60_000).toISOString();
        reschedule(date, dateKey, id, { reminderAt });
      }} onSlimeSplit={(date, id) => {
        moveToToday(date, id);
        setFocusedTaskId(id);
      }} /></div>
    <button data-guide="machine" className={`invention-button secondary-content ${generation.state}`} onClick={handleGenerateCard}
      disabled={generation.state !== 'ready'}>
      <span className="machine-symbol"><Icon name="flask" size={28} /></span>
      <strong>{machineCopy}</strong>
      <Icon name="arrow" size={25} />
    </button>
    {energyToast && <div className="energy-toast" role="status">稳定余波 +1</div>}
    {addedTaskMessage && <div className="task-added-status" role="status">{addedTaskMessage}</div>}
    <CardRevealModal card={generation.revealedCard} open={!!generation.revealedCard}
      onClose={() => generation.setRevealedCard(null)} />
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onReplayGuide={replayGuide} />
    <ArchiveModal open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      </main>
      <OnboardingGuide open={guideOpen} onFinish={finishGuide} />
    </>
  );
}
