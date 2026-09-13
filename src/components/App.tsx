import { AvatarArt } from './AvatarArt';
import { ControlPanel } from './ControlPanel';
import { useAvatar } from '../hooks/useAvatar';
import { AppDataProvider } from './shell/AppDataProvider';
import { useTasks } from '../hooks/useTasks';

/** 两个窗口复用统一数据提供器，通过仓储事件保持任务与主题同步。 */
export function App() {
  return <AppDataProvider>
    {location.hash === '#avatar' ? <FloatingAvatar /> : <ControlPanel />}
  </AppDataProvider>;
}

/** 错误通过头像边框和提示暴露，避免窗口故障无声失败。 */
function FloatingAvatar() {
  const { error, ...handlers } = useAvatar();
  const { tasks } = useTasks();
  const completed = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? completed / tasks.length : 0;
  return <main className="avatar-surface"><button {...handlers}
    className={`avatar-launcher ${error ? 'has-error' : ''}`}
    style={{ '--task-progress': `${progress * 360}deg` } as React.CSSProperties}
    title={error || '离谱道具 · 点击展开，拖动贴边'} aria-label="展开或收起离谱道具">
    <span className="avatar-progress"><AvatarArt /></span>
    {tasks.length > 0 && completed === tasks.length && <span className="avatar-complete">✓</span>}
  </button></main>;
}
