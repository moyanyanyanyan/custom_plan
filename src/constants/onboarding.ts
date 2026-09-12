export interface OnboardingStep { key:string; title:string; body:string; highlights?:string[]; target?:string; }
export const ONBOARDING_STEPS: OnboardingStep[] = [
  { key:'welcome', title:'欢迎来到研究所', body:'亲爱的所长，我终于等到你啦（・^・^）！我是看板助手 [小离谱]，您叫我 “小谱” 就好。从今天起我将协助您一同打理您的研究所，接下请让我给您介绍一下我们的研究所。' },
  { key:'add', title:'登记今日实验', body:'点击 [+] 记下一件今日想完成的实验，可预估用时。例如：爱小谱一辈子（///^ ^///）。', highlights:['[+]','预估用时'], target:'[data-guide="add-task"]' },
  { key:'done', title:'完成实验', body:'点击实验的前方的圈圈就算完成实验，启动余波就会 + 1，启动余波可用来启动发明机。', highlights:['圈圈','+ 1'], target:'[data-guide="task-list"]' },
  { key:'slime', title:'史莱姆助手', body:'如果所长您未完成今日的任务也没有关系哒，史莱姆会吃掉您未完成的任务，等到合适的时机就会还给您哒。', highlights:['史莱姆','还给您'], target:'[data-guide="slime"]' },
  { key:'machine', title:'发明机', body:'您完成今日任务后收集到的启动余波可用来启动发明机，生成今日卡牌。注：一天只能生成一张卡牌，可不要贪心哟，因为小谱明日还想与您在见面呐 (~)', highlights:['启动余波','启动发明机','今日卡牌','一天只能生成一张卡牌'], target:'[data-guide="machine"]' },
  { key:'archive', title:'收藏册', body:'可以用来收藏所长您的卡牌，这都是小谱与您在一起打理研究所的痕迹哟。', highlights:['收藏','卡牌','小谱','痕迹'], target:'[data-guide="collection"]' },
  { key:'settings', title:'个性化', body:'您可以在这里修改头像壁纸等，也可以重新与我见面哟（^ ^）', highlights:['头像','壁纸','重新与我见面'], target:'[data-guide="settings"]' },
];
