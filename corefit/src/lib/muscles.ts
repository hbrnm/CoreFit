import { MUSCLE_LABELS, type Muscle } from '../data/exercises';
import type { LocalWorkoutLog } from './db';
import { addDays, localDateStr } from './date';
import { findExercise } from './workoutStats';
import type { Exercise } from '../data/exercises';

export type MuscleWindow = '7' | '30' | '90' | 'all';

export const MUSCLE_ORDER = Object.keys(MUSCLE_LABELS) as Muscle[];

export interface MuscleExerciseShare {
  id: string;
  name: string;
  sets: number;
}

export interface MuscleLoad {
  muscle: Muscle;
  label: string;
  sets: number;
  exercises: MuscleExerciseShare[];
}

const WINDOW_DAYS: Record<Exclude<MuscleWindow, 'all'>, number> = { '7': 6, '30': 29, '90': 89 };

/** Set de lucru: grupa principală +1, fiecare grupă ajutătoare +0,5. Încălzirea nu intră. */
export function muscleBalance(
  logs: LocalWorkoutLog[],
  catalog: Map<string, Exercise>,
  today: string,
  window: MuscleWindow,
): MuscleLoad[] {
  const from = window === 'all' ? null : addDays(today, -WINDOW_DAYS[window]);
  const totals = new Map<Muscle, { sets: number; exercises: Map<string, MuscleExerciseShare> }>();
  for (const muscle of MUSCLE_ORDER) totals.set(muscle, { sets: 0, exercises: new Map() });

  for (const log of logs) {
    if (log.deleted || log.set_type !== 'work') continue;
    const date = localDateStr(new Date(log.logged_at));
    if (from && (date < from || date > today)) continue;
    const exercise = findExercise(catalog, log.exercise_id, log.exercise_name);
    const shares: Array<[Muscle, number]> = [[exercise.muscle, 1]];
    for (const muscle of exercise.synergists ?? []) {
      if (muscle !== exercise.muscle) shares.push([muscle, 0.5]);
    }
    for (const [muscle, amount] of shares) {
      const bucket = totals.get(muscle);
      if (!bucket) continue;
      bucket.sets += amount;
      const share = bucket.exercises.get(exercise.id) ?? { id: exercise.id, name: exercise.name, sets: 0 };
      share.sets += amount;
      bucket.exercises.set(exercise.id, share);
    }
  }

  return MUSCLE_ORDER.map((muscle) => {
    const bucket = totals.get(muscle)!;
    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      sets: bucket.sets,
      exercises: [...bucket.exercises.values()].sort((a, b) => b.sets - a.sets),
    };
  });
}
