import { isDesktop } from './desktop';

/** 演示旁路：URL 带 ?demo=1 时进入无记录测试模式 */
export const isDemoMode = (): boolean =>
  new URLSearchParams(window.location.search).has('demo');

/** 卡牌测试旁路只影响卡牌生成，不改变其他演示数据逻辑。 */
export const isCardTestMode = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  // Tauri 开发窗口自动开启，方便本地软件测试；正式桌面包不会继承该旁路。
  return params.has('card-test') || params.has('demo') || (isDesktop && import.meta.env.DEV);
};
