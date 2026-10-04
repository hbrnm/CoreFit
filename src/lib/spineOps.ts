import { SPINE_ZONES, type HealthProgram, type ProgramExercise } from '../data/health';
import { CHECKLIST_IDS } from '../data/spineChecklist';
import { addDays } from './date';
import { db, stamp, type LocalPainLog, type LocalSpineChecklist, type RegionId } from './db';

/** Lista bifată după apăsarea pe `id`: adaugă sau scoate; păstrează doar id-uri cunoscute. */
export function toggled(done: readonly string[], id: string): string[] {
  const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
  return next.filter((d) => CHECKLIST_IDS.has(d));
}

export async function toggleChecklistItem(userId: string, date: string, id: string): Promise<void> {
  await db.transaction('rw', db.spineChecklists, async () => {
    const cur = await db.spineChecklists.get([userId, date]);
    const row: LocalSpineChecklist = { user_id: userId, log_date: date, done: toggled(cur?.done ?? [], id), ...stamp() };
    await db.spineChecklists.put(row);
  });
}

/** Zile la rând, până azi inclusiv (sau până ieri, dacă azi încă nu e nimic), cu cel puțin `min` bife. */
export function checklistStreak(rows: ReadonlyArray<Pick<LocalSpineChecklist, 'log_date' | 'done'>>, today: string, min = 3): number {
  const byDate = new Map(rows.map((r) => [r.log_date, r.done.length]));
  let day = (byDate.get(today) ?? 0) >= min ? today : addDays(today, -1);
  let n = 0;
  while ((byDate.get(day) ?? 0) >= min) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

/*
 * Avertismentul de încărcare axială: genuflexiunile, îndreptările și împinsul deasupra capului
 * cu bara încarcă coloana pe verticală. Cu durere mare în zona cervicală, toracală sau lombară,
 * aplicația spune asta înainte de antrenament; nu interzice nimic, decizia rămâne a ta.
 */

/** Exercițiile din catalog care încarcă greu coloana pe verticală. */
export const AXIAL_HEAVY: ReadonlySet<string> = new Set([
  'back-squat',
  'front-squat',
  'smith-squat',
  'hack-squat',
  'deadlift',
  'sumo-deadlift',
  'rack-pull',
  'romanian-deadlift',
  'stiff-leg-deadlift',
  'good-morning',
  'overhead-press',
  'barbell-row',
  'pendlay-row',
  't-bar-row',
]);

/** De la cât, pe scala 0–10, durerea contează ca „mare”. */
export const HIGH_PAIN = 6;
/** Cât de veche poate fi notarea ca să conteze (ore). */
export const PAIN_WINDOW_H = 48;

export interface AxialWarning {
  zone: RegionId;
  score: number;
  exerciseIds: string[];
}

/**
 * Avertismentul pentru exercițiile date, sau null. Contează ultima notare din fiecare zonă a
 * coloanei, dacă e din ultimele PAIN_WINDOW_H ore; se raportează zona cu durerea cea mai mare.
 */
export function axialWarning(
  exerciseIds: readonly string[],
  painLogs: ReadonlyArray<Pick<LocalPainLog, 'region' | 'score' | 'logged_at' | 'deleted'>>,
  now: Date = new Date(),
): AxialWarning | null {
  const axial = [...new Set(exerciseIds.filter((id) => AXIAL_HEAVY.has(id)))];
  if (axial.length === 0) return null;
  const since = now.getTime() - PAIN_WINDOW_H * 3_600_000;
  const latest = new Map<RegionId, { score: number; at: string }>();
  for (const l of painLogs) {
    if (l.deleted || !SPINE_ZONES.includes(l.region)) continue;
    const t = Date.parse(l.logged_at);
    if (t < since || t > now.getTime()) continue;
    const cur = latest.get(l.region);
    if (!cur || l.logged_at > cur.at) latest.set(l.region, { score: l.score, at: l.logged_at });
  }
  let worst: AxialWarning | null = null;
  for (const [zone, { score }] of latest) {
    if (score >= HIGH_PAIN && (!worst || score > worst.score)) worst = { zone, score, exerciseIds: axial };
  }
  return worst;
}

export interface LibraryMove {
  exercise: ProgramExercise;
  /** programele din care face parte */
  programIds: string[];
}

/**
 * Mișcările din programe, pe zona lucrată (a mișcării, altfel a programului), fără dubluri:
 * aceeași mișcare poate apărea în mai multe programe.
 */
export function movementLibrary(programs: readonly HealthProgram[], zones: readonly RegionId[]): Map<RegionId, LibraryMove[]> {
  const out = new Map<RegionId, LibraryMove[]>(zones.map((z) => [z, []]));
  for (const p of programs) {
    for (const ex of p.exercises) {
      const list = out.get(ex.zone ?? p.region);
      if (!list) continue;
      const found = list.find((m) => m.exercise.id === ex.id);
      if (found) {
        if (!found.programIds.includes(p.id)) found.programIds.push(p.id);
      } else list.push({ exercise: ex, programIds: [p.id] });
    }
  }
  return out;
}
