import type { RepeatRule } from '../types/task';
import { localDateKey } from './date';

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function nextRepeatDate(key: string, rule: RepeatRule): string {
  if (rule === 'daily') return addDays(key, 1);
  if (rule === 'weekly') return addDays(key, 7);
  let next = addDays(key, 1);
  while ([0, 6].includes(dateFromKey(next).getDay())) next = addDays(next, 1);
  return next;
}

export function combineLocalDateTime(dateKey: string, time: string): Date {
  const date = dateFromKey(dateKey);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function moveReminder(reminderAt: string | null, from: string, to: string) {
  if (!reminderAt) return null;
  const reminder = new Date(reminderAt);
  const source = dateFromKey(from);
  const target = dateFromKey(to);
  reminder.setDate(reminder.getDate() + Math.round((target.getTime() - source.getTime()) / 86_400_000));
  return reminder.toISOString();
}
