import { builtinExercise, MUSCLE_LABELS, type Exercise, type Muscle } from '../data/exercises';
import type { LocalProfile, LocalRoutine } from './db';
import { addDays } from './date';
import type { MuscleFatigue } from './fatigue';
import { planForWeek } from './schedule';

/*
 * Ce e azi în plan: rutina zilei (cu mutările din săptămâna asta) sau, într-o zi liberă,
 * următorul antrenament din cele 7 zile care urmează. Plus grupele obosite pe care le lucrează.
 */

export interface PlannedDay {
  date: string;
  routine: LocalRoutine;
}

export interface TodayPlan {
  /** rutina de azi, dacă planul are una */
  today: LocalRoutine | null;
  /** următoarea zi cu antrenament, după azi, în cel mult 7 zile */
  next: PlannedDay | null;
}

/** Rutina planificată într-o zi: mutată aici săptămâna asta sau cea fixă a zilei, dacă n-a fost mutată de aici. */
function routineOn(profile: LocalProfile, date: string, routines: readonly LocalRoutine[]): LocalRoutine | null {
  const day = planForWeek(profile, date).find((d) => d.date === date);
  const id = day?.movedId ?? day?.permanentId ?? null;
  return routines.find((r) => r.id === id && !r.deleted) ?? null;
}

export function todayPlan(profile: LocalProfile, today: string, routines: readonly LocalRoutine[]): TodayPlan {
  let next: PlannedDay | null = null;
  for (let i = 1; i <= 7 && !next; i++) {
    const date = addDays(today, i);
    const routine = routineOn(profile, date, routines);
    if (routine) next = { date, routine };
  }
  return { today: routineOn(profile, today, routines), next };
}

/**
 * Grupele principale ale rutinei care sunt încă obosite, în ordinea oboselii.
 * Grupele ajutătoare nu contează aici: un avertisment pe triceps la o zi de piept ar fi zgomot.
 */
export function tiredMusclesFor(
  routine: LocalRoutine,
  fatigue: readonly MuscleFatigue[],
  custom: ReadonlyMap<string, Exercise> = new Map(),
): string[] {
  const muscles = new Set<Muscle>();
  for (const e of routine.exercises) {
    const ex = builtinExercise(e.exercise_id) ?? custom.get(e.exercise_id);
    if (ex) muscles.add(ex.muscle);
  }
  return fatigue
    .filter((f) => f.level === 'tired' && muscles.has(f.muscle))
    .sort((a, b) => b.value - a.value)
    .map((f) => MUSCLE_LABELS[f.muscle]);
}
