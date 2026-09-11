import mascot from '../assets/onboarding/mascot.jpg';
import stepAdd from '../assets/onboarding/step-add.jpg';
import stepDone from '../assets/onboarding/step-done.jpg';
import stepSlime from '../assets/onboarding/step-slime.jpg';
import stepMachine from '../assets/onboarding/step-machine.jpg';
import stepPersonal from '../assets/onboarding/step-personal.jpg';

/** 单屏指引数据：target 为空表示居中欢迎/收尾屏；illustration 为该步配图。 */
export interface OnboardingStep {
  key: string;
  tag: string;
  title: string;
  body: string;
  /** 聚光灯目标的 CSS 选择器（基于 data-guide 属性）；留空表示居中屏。 */
  target?: string;
  /** 气泡相对目标的位置，空间不足时自动翻转。 */
  placement?: 'top' | 'bottom';
  illustration?: string;
}

/** 新手指引步骤文案与配图。修改文案只需改这里，不涉及组件逻辑。 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'welcome',
    tag: 'WELCOME / 上岗引导',
    title: '欢迎来到离谱发明所',
    body: '亲爱的所长，我终于等到你啦（·^ ^·）！我是看板助手[小离谱]，您叫我"小谱"就好。从今天起我将协助您一同打理您的研究所，接下请让我给您介绍一下我们的研究所。',
  },
  {
    key: 'add-task',
    tag: 'STEP 01 / 今日实验',
    title: '登记「今日实验」',
    body: '点击[+]记下一件今日想完成的实验，可预估用时。例如：爱小谱一辈子（///^ ^///）。',
    target: '[data-guide="add-task"]',
    placement: 'bottom',
    illustration: stepAdd,
  },
  {
    key: 'complete-task',
    tag: 'STEP 02 / 完成实验',
    title: '完成实验，收集启动余波',
    body: '点击实验前方的圈圈就算完成实验，启动余波 +1，启动余波可用来启动发明机。',
    target: '[data-guide="task-list"]',
    placement: 'top',
    illustration: stepDone,
  },
  {
    key: 'slime',
    tag: 'STEP 03 / 史莱姆助手',
    title: '史莱姆助手',
    body: '如果所长您未完成今日的任务也没有关系哒，史莱姆会吃掉您未完成的任务，等到合适的时机就会还给您哒。',
    target: '[data-guide="slime-corner"]',
    placement: 'top',
    illustration: stepSlime,
  },
  {
    key: 'invention-machine',
    tag: 'STEP 04 / 今日发明机',
    title: '启动今日发明机',
    body: '您完成今日任务后收集到的启动余波可用来启动发明机，生成今日卡牌。注：一天只能生成一张卡牌，可不要贪心呦，因为小谱明日还想与您在见面呐（*~*）',
    target: '[data-guide="invention-machine"]',
    placement: 'top',
    illustration: stepMachine,
  },
  {
    key: 'collection',
    tag: 'STEP 05 / 收藏册',
    title: '发明卡牌收藏册',
    body: '可以用来收藏所长您的卡牌，这都是小谱与您在一起打理研究所的痕迹哟。',
    target: '[data-guide="collection"]',
    placement: 'bottom',
  },
  {
    key: 'personalize',
    tag: 'STEP 06 / 个性化',
    title: '个性化与悬浮入口',
    body: '您可以在这里修改头像壁纸等，也可以重新与我见面哟（^ ^)。',
    target: '[data-guide="settings"]',
    placement: 'bottom',
    illustration: stepPersonal,
  },
  {
    key: 'ready',
    tag: 'READY / 准备开工',
    title: '准备开工啦',
    body: '介绍完啦～所长快去登记今天的第一件实验吧，小谱会一直陪着您的（·^ ^·）',
  },
];

/** 看板助手吉祥物头像（指引卡片左上角圆形头像）。 */
export const ONBOARDING_MASCOT = mascot;
