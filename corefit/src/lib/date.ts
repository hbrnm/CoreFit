const pad = (n: number): string => String(n).padStart(2, '0');

/** Data locală (nu UTC!) în format YYYY-MM-DD. Important după miezul nopții, în România. */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d + delta));
}

/** Limitele unei zile locale, ca ISO UTC (pentru interogări pe `logged_at`). */
export function dayBoundsISO(dateStr: string): [string, string] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const nextStart = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return [start.toISOString(), new Date(nextStart.getTime() - 1).toISOString()];
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

export function formatDayShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ro-RO', { weekday: 'short' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatDayMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

export type WeekStartsOn = 'monday' | 'sunday';

function at(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 1 = luni … 7 = duminică. */
export function isoWeekday(dateStr: string): number {
  const day = at(dateStr).getDay();
  return day === 0 ? 7 : day;
}

/** Prima zi a săptămânii care conține `dateStr`, după preferința utilizatorului. */
export function startOfWeek(dateStr: string, weekStartsOn: WeekStartsOn): string {
  const day = at(dateStr).getDay();
  const shift = weekStartsOn === 'monday' ? (day === 0 ? 6 : day - 1) : day;
  return addDays(dateStr, -shift);
}

export function weekDates(dateStr: string, weekStartsOn: WeekStartsOn): string[] {
  const start = startOfWeek(dateStr, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatWeekdayShort(dateStr: string): string {
  return at(dateStr).toLocaleDateString('ro-RO', { weekday: 'short' });
}
