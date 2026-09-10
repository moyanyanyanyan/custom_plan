import { AvatarArt } from './AvatarArt';
import { ControlPanel } from './ControlPanel';
import { useAvatar } from '../hooks/useAvatar';
import { AppDataProvider } from './shell/AppDataProvider';

/** 两个窗口复用同一入口，但不共享业务事件或可变示例状态。 */
export function App() {
  return <AppDataProvider>
    {location.hash === '#avatar' ? <FloatingAvatar /> : <ControlPanel />}
  </AppDataProvider>;
}

/** 错误通过头像边框和提示暴露，避免窗口故障无声失败。 */
function FloatingAvatar() {
  const { error, ...handlers } = useAvatar();
  return <main className="avatar-surface"><button {...handlers}
    className={`avatar-launcher ${error ? 'has-error' : ''}`}
    title={error || '离谱发明所 · 点击展开，拖动贴边'} aria-label="展开或收起离谱发明所">
    <AvatarArt />
  </button></main>;
}
