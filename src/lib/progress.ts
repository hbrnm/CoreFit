import type { ExerciseKind, Muscle } from '../data/exercises';
import { addDays, localDateStr, startOfWeek } from './date';
import type { LocalWorkoutLog, WeekStartsOn } from './db';
import type { FatigueLevel, MuscleFatigue } from './fatigue';
import { fatigueLevel } from './fatigue';
import { estimate1RM, formatNum, plural } from './numbers';

/*
 * Ecranele de progres: intervalele de timp, seria 1RM pe zile sau săptămâni, propozițiile
 * cu ritmul (în stilul Tendințelor de pe Acasă), oboseala pe grupe mari și grila graficelor.
 */

export type Range = '7z' | '30z' | '90z' | '1an';

export const RANGES: ReadonlyArray<{ value: Range; label: string; days: number }> = [
  { value: '7z', label: '7Z', days: 7 },
  { value: '30z', label: '30Z', days: 30 },
  { value: '90z', label: '90Z', days: 90 },
  { value: '1an', label: '1 an', days: 365 },
];

export const rangeDays = (range: Range): number => RANGES.find((r) => r.value === range)?.days ?? 30;

/** Prima zi din interval: 7Z înseamnă azi și cele 6 zile dinainte. */
export function rangeFrom(today: string, range: Range): string {
  return addDays(today, -(rangeDays(range) - 1));
}

/** Pe intervale scurte, un punct pe zi; pe cele lungi, unul pe săptămână (cel mai bun). */
export function bucketFor(range: Range): 'day' | 'week' {
  return rangeDays(range) <= 30 ? 'day' : 'week';
}

export interface SeriesPoint {
  /** ziua, sau prima zi a săptămânii */
  date: string;
  value: number;
}

/**
 * Cea mai bună valoare pe zi sau pe săptămână pentru un exercițiu: 1RM estimat (Epley, serii de
 * 1–12 repetări) la exercițiile cu greutate, altfel repetările sau secundele.
 */
export function bestSeries(
  logs: ReadonlyArray<Pick<LocalWorkoutLog, 'exercise_id' | 'weight_kg' | 'reps' | 'logged_at'>>,
  exerciseId: string,
  kind: ExerciseKind,
  from: string,
  to: string,
  bucket: 'day' | 'week',
  weekStartsOn: WeekStartsOn,
): SeriesPoint[] {
  const best = new Map<string, number>();
  for (const l of logs) {
    if (l.exercise_id !== exerciseId) continue;
    const day = localDateStr(new Date(l.logged_at));
    if (day < from || day > to) continue;
    const value = kind === 'reps' ? (estimate1RM(l.weight_kg, l.reps) ?? 0) : l.reps;
    if (value <= 0) continue;
    const key = bucket === 'day' ? day : startOfWeek(day, weekStartsOn);
    if (value > (best.get(key) ?? 0)) best.set(key, value);
  }
  return [...best.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/**
 * „Ai crescut 7,5 kg în 8 săptămâni, cam 0,9 kg pe săptămână.” Între primul și ultimul punct.
 * Null cu mai puțin de două puncte sau dacă sunt în aceeași zi.
 */
export function changeSentence(points: readonly SeriesPoint[], unit: string): string | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const span = days(first.date, last.date);
  if (span <= 0) return null;
  const delta = Math.round((last.value - first.value) * 10) / 10;
  const weeks = Math.round(span / 7);
  const when = weeks >= 2 ? `în ${plural(weeks, 'săptămână', 'săptămâni')}` : `în ${plural(span, 'zi', 'zile')}`;
  if (Math.abs(delta) < 0.5) return `Stabil ${when}: ${formatNum(last.value)} ${unit}.`;
  const verb = delta > 0 ? 'Ai crescut' : 'Ai scăzut';
  const perWeek = weeks >= 2 ? `, cam ${formatNum(Math.abs(delta) / (span / 7))} ${unit} pe săptămână` : '';
  return `${verb} ${formatNum(Math.abs(delta))} ${unit} ${when}${perWeek}.`;
}

/** Ritmul greutății: „−0,3 kg pe săptămână”, sau „stabil” sub 0,05 kg. */
export function rateText(kgPerWeek: number): string {
  if (Math.abs(kgPerWeek) < 0.05) return 'stabil';
  const sign = kgPerWeek > 0 ? '+' : '−';
  return `${sign}${formatNum(Math.abs(kgPerWeek), 2)} kg pe săptămână`;
}

/** Grupele mari din ecranul de progres; picioarele adună cvadricepșii, femuralii, fesierii și gambele. */
export const FATIGUE_GROUPS: ReadonlyArray<{ label: string; muscles: Muscle[] }> = [
  { label: 'Piept', muscles: ['chest'] },
  { label: 'Spate', muscles: ['back'] },
  { label: 'Umeri', muscles: ['shoulders'] },
  { label: 'Biceps', muscles: ['biceps'] },
  { label: 'Triceps', muscles: ['triceps'] },
  { label: 'Picioare', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { label: 'Abdomen', muscles: ['core'] },
];

export const FATIGUE_SHORT: Record<FatigueLevel, string> = { tired: 'Obosit', partial: 'Parțial', fresh: 'Odihnit' };

/** Oboseala pe grupe mari (cea mai obosită componentă), de la cea mai obosită la cea mai odihnită. */
export function fatigueByGroup(fatigue: readonly MuscleFatigue[]): Array<{ label: string; value: number; level: FatigueLevel }> {
  const by = new Map(fatigue.map((f) => [f.muscle, f.value]));
  return FATIGUE_GROUPS.map((g) => {
    const value = Math.max(0, ...g.muscles.map((m) => by.get(m) ?? 0));
    return { label: g.label, value, level: fatigueLevel(value) };
  }).sort((a, b) => b.value - a.value);
}

/**
 * Liniile de grilă ale unui grafic: 2–3 valori „rotunde” (pas de 1, 2, 2,5 sau 5 × 10^n)
 * între minim și maxim, ca „90 kg” și „95 kg” în machetă.
 */
export function gridLines(min: number, max: number): number[] {
  if (!(max > min)) return [Math.round(min)];
  const raw = (max - min) / 2;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
