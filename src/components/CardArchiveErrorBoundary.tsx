import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/** 图鉴局部兜底，避免单条历史数据异常导致整个桌面面板白屏。 */
export class CardArchiveErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('卡牌图鉴渲染异常', error, info.componentStack);
  }
  render() {
    if (this.state.failed) return <p className="empty-hint">卡牌图鉴暂时无法显示，请关闭后重试</p>;
    return this.props.children;
  }
}
