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

export interface SetPosition {
  exIndex: number;
  setIndex: number;
}

/** Seria care urmează: prima nebifată, în ordinea exercițiilor; null când totul e bifat. */
export function nextPendingSet(exercises: readonly DraftExercise[]): SetPosition | null {
  for (let exIndex = 0; exIndex < exercises.length; exIndex += 1) {
    const setIndex = exercises[exIndex].sets.findIndex((s) => !s.done);
    if (setIndex >= 0) return { exIndex, setIndex };
  }
  return null;
}

/** Câte serii sunt bifate din câte sunt în schiță (încălzirile incluse, ca în Strong). */
export function setProgress(exercises: readonly DraftExercise[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const e of exercises) {
    total += e.sets.length;
    done += e.sets.filter((s) => s.done).length;
  }
  return { done, total };
}

/** Numărul afișat al seriei: seriile normale și până la eșec se numără; încălzirea și drop set-ul au literă. */
export function setNumber(exercise: DraftExercise, setIndex: number): number | null {
  const kind = exercise.sets[setIndex]?.kind;
  if (kind === 'warmup' || kind === 'drop') return null;
  return exercise.sets.slice(0, setIndex + 1).filter((s) => s.kind === 'work' || s.kind === 'failure').length;
}

/** „3 × 6–8 · pauză 2:30”: ținta exercițiului, din rutină. */
export function targetLabel(exercise: DraftExercise, restSeconds: number): string {
  const sets = exercise.sets.filter((s) => s.kind !== 'warmup').length;
  const r = exercise.repRange;
  const reps = r ? (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`) : null;
  const m = Math.floor(restSeconds / 60);
  const rest = `${m}:${String(restSeconds % 60).padStart(2, '0')}`;
  return [reps ? `${sets} × ${reps}` : `${sets} ${sets === 1 ? 'serie' : 'serii'}`, `pauză ${rest}`].join(' · ');
}

/** „Ultima dată”: seriile identice la rând se adună: „3 serii de 80 × 8, 75 × 10”. */
export function compactSets(labels: readonly string[]): string {
  const groups: Array<{ label: string; n: number }> = [];
  for (const label of labels) {
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.n += 1;
    else groups.push({ label, n: 1 });
  }
  return groups.map((g) => (g.n > 1 ? `${g.n} serii de ${g.label}` : g.label)).join(', ');
}

export interface PreviewRow {
  /** „Tracțiuni + Flotări la paralele” la superset */
  title: string;
  /** „3 × 6–8 · 80 kg”, sau „superset · 3 runde” */
  detail: string;
}

/**
 * Lista de pe Start, înainte de pornire: un rând pe exercițiu, un rând pe superset.
 * Greutatea e cea cu care se precompletează prima serie (sugestia de progresie inclusă).
 */
export function previewRows(exercises: readonly DraftExercise[], nameOf: (id: string) => string): PreviewRow[] {
  return groupLinked(exercises, (e) => e.linkedToNext).map((group) => {
    const items = group.map((i) => exercises[i]);
    if (items.length > 1) {
      const rounds = Math.max(...items.map((e) => e.sets.filter((s) => s.kind !== 'warmup').length));
      return { title: items.map((e) => nameOf(e.exercise_id)).join(' + '), detail: `superset · ${rounds} ${rounds === 1 ? 'rundă' : 'runde'}` };
    }
    const e = items[0];
    const work = e.sets.filter((s) => s.kind !== 'warmup');
    const r = e.repRange;
    const reps = r ? (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`) : null;
    const parts = [reps ? `${work.length} × ${reps}` : `${work.length} ${work.length === 1 ? 'serie' : 'serii'}`];
    const weight = work[0]?.weight ?? '';
    if (weight !== '') parts.push(`${weight} kg`);
    return { title: nameOf(e.exercise_id), detail: parts.join(' · ') };
  });
}
