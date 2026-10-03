import { builtinExercise, type Exercise } from '../data/exercises';
import type { LocalCustomExercise, LocalWorkoutLog, LocalWorkoutSession } from './db';
import { addDays, localDateStr, startOfWeek } from './date';
import { estimate1RM } from './numbers';

/** Catalogul complet: exerciții predefinite plus cele create de utilizator. */
export function buildCatalog(custom: LocalCustomExercise[]): Map<string, Exercise> {
  const map = new Map<string, Exercise>();
  for (const c of custom) {
    if (c.deleted) continue;
    map.set(c.id, { id: c.id, name: c.name, muscle: c.muscle, equipment: c.equipment, kind: c.kind, custom: true });
  }
  return map;
}

export function findExercise(catalog: Map<string, Exercise>, id: string, fallbackName = ''): Exercise {
  return (
    builtinExercise(id) ??
    catalog.get(id) ?? {
      id,
      name: fallbackName || id.replace(/^name:/, ''),
      muscle: 'core',
      equipment: 'other',
      kind: 'reps',
    }
  );
}

/** Epley, folosită pentru comparații între seturi (fără limita de 12 repetări). */
export function epley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/** Scorul unui set, pentru recorduri. Mai mare = mai bun. */
export function setScore(kind: Exercise['kind'], weightKg: number, reps: number): number {
  if (kind === 'reps') return epley(weightKg, reps);
  if (kind === 'bodyweight') return weightKg > 0 ? 1000 + epley(weightKg, reps) : reps;
  return reps;
}

/** Volum în kg (greutate x repetări). Exercițiile cu durată nu au volum. */
export function setVolume(kind: Exercise['kind'], weightKg: number, reps: number): number {
  return kind === 'duration' ? 0 : weightKg * reps;
}

export function sessionMinutes(s: Pick<LocalWorkoutSession, 'started_at' | 'ended_at'>): number {
  if (!s.ended_at) return 0;
  return Math.max(0, Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60000));
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
}

/** Recordurile bătute în această sesiune față de tot ce s-a făcut înainte de ea. */
export function detectRecords(
  sessionSets: LocalWorkoutLog[],
  earlier: LocalWorkoutLog[],
  catalog: Map<string, Exercise>,
): PersonalRecord[] {
  const best = new Map<string, number>();
  for (const l of earlier) {
    if (l.deleted || l.set_type === 'warmup') continue;
    const kind = findExercise(catalog, l.exercise_id, l.exercise_name).kind;
    const score = setScore(kind, l.weight_kg, l.reps);
    if (score > (best.get(l.exercise_id) ?? 0)) best.set(l.exercise_id, score);
  }

  const records = new Map<string, PersonalRecord & { score: number }>();
  for (const l of sessionSets) {
    if (l.deleted || l.set_type === 'warmup') continue;
    const kind = findExercise(catalog, l.exercise_id, l.exercise_name).kind;
    const score = setScore(kind, l.weight_kg, l.reps);
    const previous = best.get(l.exercise_id);
    // fără istoric nu declarăm record: prima dată nu are cu ce să fie comparată
    if (previous === undefined || score <= previous) continue;
    const current = records.get(l.exercise_id);
    if (!current || score > current.score) {
      records.set(l.exercise_id, {
        exerciseId: l.exercise_id,
        exerciseName: l.exercise_name,
        weightKg: l.weight_kg,
        reps: l.reps,
        score,
      });
    }
  }
  return [...records.values()].map(({ score, ...rest }) => {
    void score;
    return rest;
  });
}

export interface WeeklyActivity {
  strengthDays: number;
  /** minute de efort moderat, cu efortul intens numărat dublu (ca în ghidul OMS) */
  aerobicEquivalentMin: number;
}

/** Activitatea din ultimele 7 zile, ca să fie comparată cu recomandările OMS. */
export function weeklyActivity(sessions: LocalWorkoutSession[], today: string): WeeklyActivity {
  const from = addDays(today, -6);
  const strengthDates = new Set<string>();
  let aerobic = 0;

  for (const s of sessions) {
    if (s.deleted || !s.ended_at) continue;
    const date = localDateStr(new Date(s.started_at));
    if (date < from || date > today) continue;
    if (s.kind === 'strength') strengthDates.add(date);
    else aerobic += sessionMinutes(s) * (s.intensity === 'vigorous' ? 2 : 1);
  }
  return { strengthDays: strengthDates.size, aerobicEquivalentMin: aerobic };
}

/** Aceeași comparație OMS, dar pe săptămâna calendaristică (luni sau duminică). */
export function calendarWeekActivity(
  sessions: LocalWorkoutSession[],
  today: string,
  weekStartsOn: 'monday' | 'sunday',
): WeeklyActivity {
  const start = startOfWeek(today, weekStartsOn);
  const end = addDays(start, 6);
  const cappedEnd = end > today ? today : end;
  const strengthDates = new Set<string>();
  let aerobic = 0;
  for (const s of sessions) {
    if (s.deleted || !s.ended_at) continue;
    const date = localDateStr(new Date(s.started_at));
    if (date < start || date > cappedEnd) continue;
    if (s.kind === 'strength') strengthDates.add(date);
    else aerobic += sessionMinutes(s) * (s.intensity === 'vigorous' ? 2 : 1);
  }
  return { strengthDays: strengthDates.size, aerobicEquivalentMin: aerobic };
}

// ------------------------------------------------------------------ superseturi

/**
 * Grupează indici consecutivi legați printr-un flag "legat de următorul" (superseturi).
 * Ex.: legături [true, false, true, true, false] -> grupuri [[0,1], [2,3,4]].
 */
export function groupLinked<T>(rows: readonly T[], isLinkedToNext: (row: T) => boolean): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  rows.forEach((row, i) => {
    current.push(i);
    if (!isLinkedToNext(row)) {
      groups.push(current);
      current = [];
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}

/**
 * Cel mai bun 1RM estimat dintr-o listă de serii, și seria din care vine.
 * Doar seriile de 1-12 repetări cu greutate: peste 12, estimarea nu e de încredere.
 */
export function bestEstimated1RM(
  sets: ReadonlyArray<Pick<LocalWorkoutLog, 'weight_kg' | 'reps'>>,
): { value: number; weightKg: number; reps: number } | null {
  let best: { value: number; weightKg: number; reps: number } | null = null;
  for (const s of sets) {
    const value = estimate1RM(s.weight_kg, s.reps);
    if (value !== null && (!best || value > best.value)) best = { value, weightKg: s.weight_kg, reps: s.reps };
  }
  return best;
}
