import { MUSCLE_LABELS, type Exercise, type Muscle } from '../data/exercises';
import type { LocalWorkoutLog } from './db';
import { MUSCLE_ORDER } from './muscles';
import { findExercise } from './workoutStats';

/*
 * Oboseala pe grupe musculare: un model simplu, nu o măsurătoare.
 *
 * Fiecare set de lucru adaugă oboseală grupei principale (1) și grupelor ajutătoare (0,5),
 * înmulțită cu cât de aproape de limită a fost setul (din RIR sau RPE). Oboseala scade apoi
 * exponențial, cu un timp de înjumătățire de FATIGUE_HALF_LIFE_H ore, fără un prag brusc:
 * un set de acum 3 zile mai contează puțin, nu dispare dintr-odată.
 * Încălzirea și exercițiile cronometrate cu greutatea corpului (plank) nu intră.
 */

/** După atâtea ore, oboseala adusă de un set scade la jumătate. */
export const FATIGUE_HALF_LIFE_H = 24;

/** Atâtea seturi grele, făcute chiar acum, înseamnă oboseală maximă pe scală (100%). */
export const FATIGUE_FULL_SETS = 10;

/** Cât contează un set când efortul nu e notat: un set de lucru obișnuit, cu 2 repetări în rezervă. */
const UNKNOWN_EFFORT = 0.8;

/** Repetări în rezervă → cât de solicitant a fost setul (0 = până la eșec). */
function effortFactor(rir: number): number {
  if (rir <= 0) return 1;
  if (rir >= 4) return 0.5;
  return [1, 0.9, 0.8, 0.65][Math.round(rir)];
}

/** Factorul unui set, din RIR sau RPE (RPE 10 = RIR 0). */
export function setEffort(log: Pick<LocalWorkoutLog, 'rpe' | 'effort_scale'>): number {
  if (log.rpe == null || !log.effort_scale) return UNKNOWN_EFFORT;
  const rir = log.effort_scale === 'rpe' ? 10 - log.rpe : log.rpe;
  return effortFactor(rir);
}

export type FatigueLevel = 'fresh' | 'partial' | 'tired';

export const FATIGUE_LABELS: Record<FatigueLevel, string> = {
  fresh: 'Odihnit',
  partial: 'Parțial refăcut',
  tired: 'Obosit',
};

export interface MuscleFatigue {
  muscle: Muscle;
  label: string;
  /** 0..1, unde 1 = FATIGUE_FULL_SETS seturi grele chiar acum */
  value: number;
  level: FatigueLevel;
  /** orele până când oboseala coboară sub pragul "odihnit", 0 dacă e deja acolo */
  hoursToFresh: number;
}

/** Sub acest nivel grupa e considerată odihnită; peste TIRED, obosită. */
export const FRESH_BELOW = 0.2;
export const TIRED_FROM = 0.5;

export function fatigueLevel(value: number): FatigueLevel {
  if (value < FRESH_BELOW) return 'fresh';
  if (value < TIRED_FROM) return 'partial';
  return 'tired';
}

export function muscleFatigue(
  logs: readonly LocalWorkoutLog[],
  catalog: Map<string, Exercise>,
  now: Date = new Date(),
): MuscleFatigue[] {
  const load = new Map<Muscle, number>(MUSCLE_ORDER.map((m) => [m, 0]));
  const nowMs = now.getTime();

  for (const log of logs) {
    if (log.deleted || log.set_type !== 'work') continue;
    const hours = (nowMs - Date.parse(log.logged_at)) / 3_600_000;
    if (hours < 0 || hours > FATIGUE_HALF_LIFE_H * 10) continue;
    const exercise = findExercise(catalog, log.exercise_id, log.exercise_name);
    if (exercise.kind === 'duration' && log.weight_kg === 0) continue;
    const amount = setEffort(log) * Math.pow(0.5, hours / FATIGUE_HALF_LIFE_H);
    load.set(exercise.muscle, (load.get(exercise.muscle) ?? 0) + amount);
    for (const m of exercise.synergists ?? []) {
      if (m !== exercise.muscle) load.set(m, (load.get(m) ?? 0) + amount * 0.5);
    }
  }

  return MUSCLE_ORDER.map((muscle) => {
    const value = Math.min(1, (load.get(muscle) ?? 0) / FATIGUE_FULL_SETS);
    const hoursToFresh = value < FRESH_BELOW ? 0 : Math.ceil(FATIGUE_HALF_LIFE_H * Math.log2(value / FRESH_BELOW));
    return { muscle, label: MUSCLE_LABELS[muscle], value, level: fatigueLevel(value), hoursToFresh };
  });
}
