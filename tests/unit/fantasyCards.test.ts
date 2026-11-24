import { describe, expect, it } from 'vitest';
import { applyCardCopy, cardStackKey, drawRank, fallbackDraft, isFantasyCard, parseCardDraft, parseRelationship } from '../../src/utils/fantasyCards';
import { generateCardFromTasks } from '../../src/utils/cardGenerator';
import { normalizeCards } from '../../src/utils/validation';
import { createTask } from '../../src/utils/taskModel';

const sources = ['读书', '帮助小林修复代码', '跑步', '整理桌面', '做饭'];
const base = () => generateCardFromTasks(sources.map(name => createTask({ id: name, name, completed: true, icon: 'flask', minutes: 10, group: 'A' })))!;
const relation = { kind: 'friendship_active', target: '小林', taskIndex: 1, quote: sources[1], description: '朋友的报错也是报错。', setting: '你是小林的朋友。', scene: 'Two silver linked rings.' };

describe('幻想卡牌生成约束', () => {
  it.each([[0,0,'2'],[.54999,.999,'4'],[.55,0,'5'],[.84999,.999,'7'],[.85,0,'8'],[.96999,.999,'10'],[.97,0,'J'],[.999,.999,'J']])('点数概率边界 %s %s → %s', (group,index,rank) => {
    let calls=0; expect(drawRank(() => Number(calls++ === 0 ? group : index))).toBe(rank);
  });
  it.each(sources)('本地模板完整并关联任务：%s', name => {
    const draft=fallbackDraft([name]); expect(parseCardDraft(draft,[name])).toEqual(draft);
    expect(draft.effect).not.toMatch(/[\r\n]/);
  });
  it('普通牌不接受效果列表、人物场景、虚构证据或直接恢复SP', () => {
    const draft=fallbackDraft(sources);
    for (const patch of [{effect:['效果']},{effect:'消耗：10点MP\n作用：攻击'},{effect:'恢复10%的红心SP。'},{scene:'A girl with a book.'},{inspiration:[{taskIndex:0,quote:'出国旅行',motif:'旅行'}]}]) {
      expect(parseCardDraft({...draft,...patch},sources)).toBeNull();
    }
  });
  it('AI不能覆盖程序点数、id、日期或任务快照', () => {
    const card=base(); const result=applyCardCopy(card,{ordinary:{...fallbackDraft(sources),rank:'K',id:'fake',sourceTasks:[],dailyKey:'fake'}});
    expect(result.rank).toBe(card.rank); expect(result.id).toBe(card.id); expect(result.sourceTasks).toEqual(sources);
    expect(result.dailyKey).toBe(card.dailyKey);
  });
  it('没有有效证据不出A，候选无效不会阻止普通牌', () => {
    const card=base(); const ordinary=fallbackDraft(sources);
    for (const candidate of [null, {...relation,quote:'帮助不存在的人'}, {...relation,kind:'love_active'}, {...relation,target:'电脑'}]) {
      expect(applyCardCopy(card,{ordinary,relationship:candidate},()=>0).rank).toBe(card.rank);
    }
  });
  it('有效关系的20%边界和固定机制', () => {
    const card=base(); const copy={ordinary:fallbackDraft(sources),relationship:relation};
    const result=applyCardCopy(card,copy,()=>.1999);
    expect(result).toMatchObject({rank:'A',suit:'spades',category:'setting',relation:{target:'小林',kind:'friendship_active'}});
    expect(result.effect).toBe('当你帮助小林时，回复10%的黑桃SP。');
    expect(isFantasyCard(result)).toBe(true);
    expect(applyCardCopy(card,copy,()=>.2).rank).toBe(card.rank);
  });
  it('不把被动表白误判为主动，不从普通交流推断爱恋', () => {
    expect(parseRelationship({...relation,kind:'love_active',quote:'和小林开会'},['和小林开会'])).toBeNull();
    const candidate={...relation,taskIndex:0,kind:'love_passive',quote:'收到小林的表白'};
    expect(parseRelationship(candidate,[candidate.quote])).not.toBeNull();
    expect(parseRelationship({...candidate,kind:'love_active'},[candidate.quote])).toBeNull();
    expect(parseRelationship({...relation,taskIndex:0,target:'小王',setting:'你是小王的朋友。',quote:'帮助小林修复代码，和小王聊天'},['帮助小林修复代码，和小王聊天'])).toBeNull();
  });
  it('新旧卡保存重载共存，保留底层tier和完整来源', () => {
    const card=base(); const legacy={...card,id:'legacy',version:undefined,rank:undefined,suit:undefined,category:undefined,effect:undefined,setting:undefined,scene:undefined,inspiration:undefined,stackKey:'旧卡',imagePath:'old.png'};
    const loaded=normalizeCards(JSON.parse(JSON.stringify([card,legacy])));
    expect(loaded).toEqual([card,legacy]);
    expect(loaded[0].tier).toBe('copper'); expect(loaded[1].imagePath).toBe('old.png');
    expect(loaded[1].rank).toBeUndefined();
  });
  it('同名异效果、异说明、异关系对象不堆叠', () => {
    const card=base();
    expect(cardStackKey({...card,id:'another'})).toBe(card.stackKey);
    expect(cardStackKey({...card,effect:'另一个效果'})).not.toBe(card.stackKey);
    expect(cardStackKey({...card,description:'另一个吐槽'})).not.toBe(card.stackKey);
    const a=applyCardCopy(card,{ordinary:fallbackDraft(sources),relationship:relation},()=>0);
    expect(cardStackKey({...a,relation:{...a.relation!,target:'小王'}})).not.toBe(a.stackKey);
  });
});
