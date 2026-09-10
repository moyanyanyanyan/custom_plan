export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function elapsedDays(from: string, until = new Date()): number {
  const start = new Date(`${from.slice(0, 10)}T00:00:00`);
  const end = new Date(until.getFullYear(), until.getMonth(), until.getDate());
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}
