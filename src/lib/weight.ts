import { addDays } from './date';
import type { WeightPoint } from './nutrition';

/*
 * Greutatea: media pe 7 zile și ritmul săptămânal, ca în MacroFactor. Cântarul variază zilnic
 * cu apa și mesele; media și trendul (WeightPoint.trend, din nutrition.weightTrend) nu.
 */

/** Media cântăririlor din ultimele 7 zile calendaristice, până la `date` inclusiv; null fără cântăriri. */
export function sevenDayAverage(points: ReadonlyArray<Pick<WeightPoint, 'date' | 'kg'>>, date: string): number | null {
  const from = addDays(date, -6);
  const inWindow = points.filter((p) => p.date >= from && p.date <= date);
  if (inWindow.length === 0) return null;
  return Math.round((inWindow.reduce((s, p) => s + p.kg, 0) / inWindow.length) * 100) / 100;
}

/**
 * Ritmul săptămânal (kg/săptămână): panta dreptei de regresie prin trend, în ultimele `days` zile.
 * Cere cel puțin 3 puncte întinse pe minimum 7 zile; altfel null (prea puțin ca să spună ceva).
 */
export function weeklyRate(points: readonly WeightPoint[], today: string, days = 28): number | null {
  const from = addDays(today, -(days - 1));
  const inWindow = points.filter((p) => p.date >= from && p.date <= today);
  if (inWindow.length < 3) return null;
  const x = inWindow.map((p) => (Date.parse(p.date) - Date.parse(inWindow[0].date)) / 86_400_000);
  if (x[x.length - 1] < 7) return null;
  const y = inWindow.map((p) => p.trend);
  const mx = x.reduce((a, b) => a + b, 0) / x.length;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  let num = 0;
  let den = 0;
  x.forEach((xi, i) => {
    num += (xi - mx) * (y[i] - my);
    den += (xi - mx) ** 2;
  });
  return Math.round((num / den) * 7 * 100) / 100;
}
