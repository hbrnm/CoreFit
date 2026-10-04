import { addDays, startOfWeek } from './date';
import type { LocalWorkoutSession, WeekStartsOn } from './db';
import { formatNum, plural } from './numbers';
import type { WeightPoint } from './nutrition';

/*
 * Tendințele de pe Acasă, în stilul Apple Health: o propoziție simplă plus seria din grafic.
 * Totul din datele notate; fără date suficiente, funcțiile întorc null și cardul nu apare.
 */

/** Zilele [today - n + 1, today], în ordine. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

/** Caloriile pe zi, pentru zilele cerute (0 unde nu e nimic notat). */
export function kcalByDay(entries: ReadonlyArray<{ log_date: string; kcal: number }>, days: readonly string[]): number[] {
  const sum = new Map<string, number>();
  for (const e of entries) sum.set(e.log_date, (sum.get(e.log_date) ?? 0) + e.kcal);
  return days.map((d) => Math.round(sum.get(d) ?? 0));
}

/** Sub atâtea kcal, o zi e considerată nenotată (o gustare uitată nu e o zi de post). */
export const MIN_LOGGED_KCAL = 300;
/** Atâtea zile notate, minimum, ca media să spună ceva. */
export const MIN_LOGGED_DAYS = 7;

export interface KcalInsight {
  avg: number;
  loggedDays: number;
  /** media minus ținta; negativ = sub țintă */
  diff: number | null;
  text: string;
}

/** „În ultimele 4 săptămâni ai mâncat în medie 2 250 kcal pe zi, cu 150 sub țintă.” */
export function kcalInsight(series: readonly number[], target: number | null): KcalInsight | null {
  const logged = series.filter((k) => k >= MIN_LOGGED_KCAL);
  if (logged.length < MIN_LOGGED_DAYS) return null;
  const avg = Math.round(logged.reduce((a, b) => a + b, 0) / logged.length / 10) * 10;
  const weeks = Math.round(series.length / 7);
  const span = weeks >= 2 ? `În ultimele ${plural(weeks, 'săptămână', 'săptămâni')}` : `În ultimele ${plural(series.length, 'zi', 'zile')}`;
  let text = `${span} ai mâncat în medie ${formatNum(avg, 0)} kcal pe zi`;
  let diff: number | null = null;
  if (target) {
    diff = avg - target;
    if (Math.abs(diff) < 50) text += ', cât ținta.';
    else text += `, cu ${formatNum(Math.abs(diff), 0)} ${diff < 0 ? 'sub' : 'peste'} țintă.`;
  } else {
    text += '.';
  }
  return { avg, loggedDays: logged.length, diff, text };
}

/** Câte antrenamente de forță terminate în fiecare din ultimele `weeks` săptămâni (cea curentă ultima). */
export function strengthPerWeek(
  sessions: ReadonlyArray<Pick<LocalWorkoutSession, 'kind' | 'started_at' | 'ended_at' | 'deleted'>>,
  today: string,
  weekStartsOn: WeekStartsOn,
  weeks = 8,
): number[] {
  const current = startOfWeek(today, weekStartsOn);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(current, (i - weeks + 1) * 7));
  const counts = starts.map(() => 0);
  for (const s of sessions) {
    if (s.deleted || s.kind !== 'strength' || !s.ended_at) continue;
    const day = s.started_at.slice(0, 10);
    const week = startOfWeek(day, weekStartsOn);
    const idx = starts.indexOf(week);
    if (idx >= 0) counts[idx] += 1;
  }
  return counts;
}

export interface StrengthInsight {
  /** media pe săptămânile încheiate */
  avg: number;
  /** săptămâni încheiate la rând, numărând înapoi de la cea trecută, cu cel puțin `target` antrenamente */
  streak: number;
  text: string;
}

/** „Ai ținut ritmul: cel puțin 2 antrenamente de forță pe săptămână, 6 săptămâni la rând.” */
export function strengthInsight(perWeek: readonly number[], target: number): StrengthInsight | null {
  const done = perWeek.slice(0, -1); // săptămâna curentă nu e încheiată
  if (done.length === 0 || done.every((n) => n === 0)) return null;
  const avg = Math.round((done.reduce((a, b) => a + b, 0) / done.length) * 10) / 10;
  let streak = 0;
  for (let i = done.length - 1; i >= 0 && done[i] >= target; i -= 1) streak += 1;
  const text =
    streak >= 2
      ? `Ai ținut ritmul: cel puțin ${plural(target, 'antrenament', 'antrenamente')} de forță pe săptămână, ${plural(streak, 'săptămână', 'săptămâni')} la rând.`
      : `În ultimele ${plural(done.length, 'săptămână', 'săptămâni')} ai făcut în medie ${formatNum(avg)} ${avg === 1 ? 'antrenament' : 'antrenamente'} de forță pe săptămână.`;
  return { avg, streak, text };
}

export interface WeightChange {
  /** variația trendului între primul și ultimul punct din interval, kg */
  delta: number;
  days: number;
  text: string;
}

/** „−0,6 kg în 30 de zile”, din trendul netezit, nu din cântăririle brute. */
export function weightChange(points: readonly WeightPoint[], from: string, to: string): WeightChange | null {
  const inRange = points.filter((p) => p.date >= from && p.date <= to);
  if (inRange.length < 2) return null;
  const first = inRange[0];
  const last = inRange[inRange.length - 1];
  const delta = Math.round((last.trend - first.trend) * 10) / 10;
  const days = Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86_400_000);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return { delta, days, text: `${sign}${formatNum(Math.abs(delta))} kg în ${plural(days, 'zi', 'zile')}` };
}
