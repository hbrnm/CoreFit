import type { DraftExercise } from './workoutOps';
import { groupLinked } from './workoutStats';

/*
 * Modificări ale antrenamentului în curs, ca funcții pure (fără React, fără Dexie), ca să poată
 * fi testate: superseturi făcute din mers, scoaterea unui exercițiu, pauza după o serie și
 * datele pentru un antrenament notat ulterior.
 */

/** Pauza implicită, când exercițiul nu are una (0 sau lipsă). Aceeași valoare ca în workoutOps. */
const FALLBACK_REST_S = 90;

/** Leagă exercițiul `index` de următorul într-un superset, sau desface legătura dacă există. */
export function toggleSupersetWithNext(exercises: readonly DraftExercise[], index: number): DraftExercise[] {
  if (index < 0 || index >= exercises.length - 1) return [...exercises];
  return exercises.map((e, i) => (i === index ? { ...e, linkedToNext: !e.linkedToNext } : e));
}

/**
 * Scoate exercițiul `index`. Dacă era ultimul dintr-un superset, cel dinaintea lui nu mai are cu
 * cine să fie legat: legătura lui ar sări peste gol, la exercițiul următor, și ar crea un superset
 * pe care nu l-a cerut nimeni.
 */
export function removeExerciseAt(exercises: readonly DraftExercise[], index: number): DraftExercise[] {
  const removed = exercises[index];
  if (!removed) return [...exercises];
  return exercises
    .map((e, i) => (i === index - 1 && !removed.linkedToNext ? { ...e, linkedToNext: false } : e))
    .filter((_, i) => i !== index);
}

/**
 * Pauza după o serie de lucru la exercițiul `index`, în secunde.
 * null = fără pauză: exercițiul e în mijlocul unui superset și urmează direct următorul.
 * La finalul unei runde de superset, pauza e cea mai lungă din grup.
 */
export function restAfterSet(exercises: readonly DraftExercise[], index: number): number | null {
  const group = groupLinked(exercises, (e) => e.linkedToNext).find((g) => g.includes(index));
  if (!group || group[group.length - 1] !== index) return null;
  return Math.max(...group.map((i) => exercises[i].rest_s || FALLBACK_REST_S));
}

export const BACKFILL_MAX_MINUTES = 600;

export interface BackfillInput {
  /** YYYY-MM-DD, ziua locală */
  date: string;
  /** HH:MM, ora locală de început */
  time: string;
  minutes: number;
}

/**
 * Începutul și sfârșitul unui antrenament notat ulterior, ca ISO UTC.
 * Returnează un mesaj de eroare dacă datele nu au sens.
 */
export function backfillWindow(
  input: BackfillInput,
  now: Date = new Date(),
): { startedAt: string; endedAt: string } | string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  const t = /^(\d{2}):(\d{2})$/.exec(input.time);
  if (!d || !t) return 'Alege data și ora la care a început antrenamentul.';
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > BACKFILL_MAX_MINUTES) {
    return `Durata trebuie să fie între 1 și ${BACKFILL_MAX_MINUTES} de minute.`;
  }
  const start = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  if (Number.isNaN(start.getTime()) || start.getDate() !== Number(d[3])) return 'Data nu este validă.';
  const end = new Date(start.getTime() + input.minutes * 60_000);
  if (end.getTime() > now.getTime()) return 'Antrenamentul s-ar termina în viitor. Pentru unul care începe acum, folosește Start.';
  return { startedAt: start.toISOString(), endedAt: end.toISOString() };
}

/**
 * Momentul notat pentru a `n`-a serie (de la 0) dintr-un antrenament notat ulterior: o secundă
 * după precedenta, pornind de la începutul antrenamentului. Păstrează ordinea seriilor și le ține
 * în trecut, ca să nu pară mai noi decât antrenamentele făcute după el.
 */
export function backfillLoggedAt(startedAt: string, n: number): string {
  return new Date(Date.parse(startedAt) + (n + 1) * 1000).toISOString();
}

/** Secundele ținute de la pornirea cronometrului de lucru, cel puțin 1. */
export function heldSeconds(startedAtMs: number, nowMs: number): number {
  return Math.max(1, Math.round((nowMs - startedAtMs) / 1000));
}
