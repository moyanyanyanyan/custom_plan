/** 演示旁路：URL 带 ?demo=1 时进入无记录测试模式 */
export const isDemoMode = (): boolean =>
  new URLSearchParams(window.location.search).has('demo');
