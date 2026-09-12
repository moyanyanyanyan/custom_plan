import type { RepeatRule, TaskDraft } from '../types/task';
import { localDateKey } from './date';
import { addDays, combineLocalDateTime, dateFromKey } from './taskSchedule';

const weekdays: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
const chineseHours: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6,
  七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12,
};

function parseDate(text: string, now: Date): { key: string; token: string } {
  const today = localDateKey(now);
  for (const [token, offset] of [['后天', 2], ['明天', 1], ['今天', 0]] as const) {
    if (text.includes(token)) return { key: addDays(today, offset), token };
  }
  const match = text.match(/(下周)?周([一二三四五六日天])/);
  if (!match) return { key: today, token: '' };
  const wanted = weekdays[match[2]];
  const current = now.getDay();
  const offset = match[1] ? 7 - ((current + 6) % 7) + wanted - 1 : (wanted - current + 7) % 7;
  return { key: addDays(today, offset), token: match[0] };
}

function parseHour(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  return chineseHours[value] ?? null;
}

function parseTime(text: string): { value: string | null; token: string } {
  const colon = text.match(/(?:上午|下午|晚上)?\s*(\d{1,2}):([0-5]\d)/);
  const clock = text.match(/(上午|下午|晚上)?\s*([零一二两三四五六七八九十]{1,3}|\d{1,2})点(?:([0-5]?\d)分?)?/);
  const match = colon ?? clock;
  if (!match) return { value: null, token: '' };
  const period = match[1] ?? '';
  let hour = parseHour(match[2]);
  if (hour === null || hour > 23) return { value: null, token: '' };
  if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
  if (period === '上午' && hour === 12) hour = 0;
  const minute = Number(match[3] ?? 0);
  return { value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, token: match[0] };
}

function parseRepeat(text: string): { value: RepeatRule | null; token: string } {
  const options: Array<[RegExp, RepeatRule]> = [[/每个工作日|工作日/, 'weekdays'], [/每天|每日/, 'daily'], [/每周/, 'weekly']];
  const found = options.find(([pattern]) => pattern.test(text));
  return found ? { value: found[1], token: text.match(found[0])?.[0] ?? '' } : { value: null, token: '' };
}

/** 只移除已确定的控制词，含糊内容始终留在标题里。 */
export function parseTaskInput(input: string, now = new Date()): TaskDraft & { confidence: 'certain' | 'partial' } {
  const date = parseDate(input, now);
  const time = parseTime(input);
  const repeat = parseRepeat(input);
  const reminderMatch = input.match(/提前\s*(\d+)\s*分钟提醒|提醒我|到时提醒/);
  let reminderAt: string | null = null;
  if (reminderMatch && time.value) {
    const reminder = combineLocalDateTime(date.key, time.value);
    if (reminderMatch[1]) reminder.setMinutes(reminder.getMinutes() - Number(reminderMatch[1]));
    reminderAt = reminder.toISOString();
  }
  const title = [date.token, time.token, repeat.token, reminderMatch?.[0] ?? '']
    .reduce((value, token) => token ? value.replace(token, ' ') : value, input)
    .replace(/\s+/g, ' ').replace(/^[，,：:；;、\s]+|[，,：:；;、\s]+$/g, '').trim();
  return { title: title || input.trim(), targetDate: date.key, time: time.value,
    reminderAt, repeatRule: repeat.value, steps: [],
    confidence: reminderMatch && !time.value ? 'partial' : 'certain' };
}

export function formatTaskDate(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return '今天';
  if (dateKey === addDays(todayKey, 1)) return '明天';
  const date = dateFromKey(dateKey);
  const days = Math.round((date.getTime() - dateFromKey(todayKey).getTime()) / 86_400_000);
  if (days > 1 && days < 7) return `周${'日一二三四五六'[date.getDay()]}`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
