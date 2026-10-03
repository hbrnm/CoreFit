import { builtinExercise } from '../data/exercises';
import type { IsoWeekday, LocalCustomExercise, LocalRoutine, Synced } from './db';
import { normalizeName } from './exerciseMatch';

/*
 * Partajarea planului: rutinele și săptămâna, într-un fișier mic. Fără antrenamente, fără
 * greutate corporală, fără nimic personal în afară de numele rutinelor.
 * La import, planul se adaugă lângă al tău: nu înlocuiește rutine și nu ocupă zile deja ocupate.
 */

export const PLAN_FILE_KIND = 'corefit-plan';
export const PLAN_FILE_VERSION = 1;

type SharedRoutine = Pick<
  LocalRoutine,
  'name' | 'notes' | 'exercises' | 'default_progression' | 'progression_increment_kg' | 'progression_reset_pct' | 'is_deload'
> & { ref: string };

type SharedExercise = Pick<LocalCustomExercise, 'name' | 'muscle' | 'equipment' | 'kind'> & { ref: string };

export interface PlanFile {
  kind: typeof PLAN_FILE_KIND;
  version: number;
  routines: SharedRoutine[];
  /** doar exercițiile proprii folosite în rutine; cele din catalog se recunosc după id */
  custom_exercises: SharedExercise[];
  /** ziua săptămânii → `ref` al rutinei */
  week: Partial<Record<IsoWeekday, string>>;
}

export function buildPlanFile(
  routines: readonly LocalRoutine[],
  customExercises: readonly LocalCustomExercise[],
  weekSlots: Partial<Record<IsoWeekday, string>>,
): PlanFile {
  const alive = routines.filter((r) => !r.deleted);
  const ids = new Set(alive.map((r) => r.id));
  const used = new Set(alive.flatMap((r) => r.exercises.map((e) => e.exercise_id)));
  return {
    kind: PLAN_FILE_KIND,
    version: PLAN_FILE_VERSION,
    routines: alive.map((r) => ({
      ref: r.id,
      name: r.name,
      notes: r.notes,
      exercises: r.exercises,
      default_progression: r.default_progression,
      progression_increment_kg: r.progression_increment_kg,
      progression_reset_pct: r.progression_reset_pct,
      is_deload: r.is_deload,
    })),
    custom_exercises: customExercises
      .filter((c) => !c.deleted && used.has(c.id))
      .map((c) => ({ ref: c.id, name: c.name, muscle: c.muscle, equipment: c.equipment, kind: c.kind })),
    week: Object.fromEntries(Object.entries(weekSlots).filter(([, id]) => id && ids.has(id))),
  };
}

export function readPlanFile(raw: unknown): PlanFile | string {
  const r = raw as Partial<PlanFile> | null;
  if (!r || typeof r !== 'object' || r.kind !== PLAN_FILE_KIND) return 'Fișierul nu este un plan CoreFit.';
  if (r.version !== PLAN_FILE_VERSION) return 'Planul e dintr-o versiune pe care aplicația nu o cunoaște.';
  if (!Array.isArray(r.routines) || !Array.isArray(r.custom_exercises) || typeof r.week !== 'object' || r.week === null) {
    return 'Planul este incomplet.';
  }
  const okRoutine = (x: SharedRoutine) => typeof x?.ref === 'string' && typeof x.name === 'string' && Array.isArray(x.exercises);
  if (!r.routines.every(okRoutine)) return 'Planul este incomplet.';
  return r as PlanFile;
}

export interface PlanMerge {
  routines: LocalRoutine[];
  customExercises: LocalCustomExercise[];
  /** doar zilele libere înainte, ocupate acum de rutine din plan */
  weekSlots: Partial<Record<IsoWeekday, string>>;
  /** zile pe care planul le voia, dar le aveai ocupate */
  busyDays: IsoWeekday[];
}

/** Adaugă planul primit la al tău. `newId` dă id-urile noi (injectat, ca să fie testabil). */
export function mergePlan(
  plan: PlanFile,
  userId: string,
  existingRoutines: readonly LocalRoutine[],
  existingCustom: readonly LocalCustomExercise[],
  weekSlots: Partial<Record<IsoWeekday, string>>,
  newId: () => string,
  synced: Synced,
): PlanMerge {
  // Exercițiile proprii: refolosește-le pe ale tale cu același nume, altfel creează-le.
  const ownByName = new Map(existingCustom.filter((c) => !c.deleted).map((c) => [normalizeName(c.name), c.id]));
  const exerciseId = new Map<string, string>();
  const customExercises: LocalCustomExercise[] = [];
  for (const c of plan.custom_exercises) {
    const mine = ownByName.get(normalizeName(c.name));
    if (mine) {
      exerciseId.set(c.ref, mine);
      continue;
    }
    const id = newId();
    exerciseId.set(c.ref, id);
    customExercises.push({ id, user_id: userId, name: c.name, muscle: c.muscle, equipment: c.equipment, kind: c.kind, deleted: false, ...synced });
  }

  // Rutinele: întotdeauna noi; un nume care există deja primește "(primit)".
  const taken = new Set(existingRoutines.filter((r) => !r.deleted).map((r) => r.name.trim().toLowerCase()));
  const routineId = new Map<string, string>();
  const routines: LocalRoutine[] = plan.routines.map((r) => {
    let name = r.name.trim() || 'Rutină primită';
    if (taken.has(name.toLowerCase())) name = `${name} (primit)`;
    taken.add(name.toLowerCase());
    const id = newId();
    routineId.set(r.ref, id);
    return {
      id,
      user_id: userId,
      name,
      notes: r.notes ?? '',
      // exercițiile din catalog își păstrează id-ul; cele proprii necunoscute nu se pot păstra
      exercises: r.exercises
        .map((e) => ({ ...e, exercise_id: exerciseId.get(e.exercise_id) ?? e.exercise_id }))
        .filter((e) => builtinExercise(e.exercise_id) || [...exerciseId.values()].includes(e.exercise_id)),
      default_progression: r.default_progression ?? 'none',
      progression_increment_kg: r.progression_increment_kg ?? 2.5,
      progression_reset_pct: r.progression_reset_pct ?? 0.1,
      is_deload: r.is_deload ?? false,
      deleted: false,
      ...synced,
    };
  });

  const nextSlots: Partial<Record<IsoWeekday, string>> = { ...weekSlots };
  const busyDays: IsoWeekday[] = [];
  for (const [day, ref] of Object.entries(plan.week) as Array<[IsoWeekday, string]>) {
    const id = routineId.get(ref);
    if (!id) continue;
    if (weekSlots[day]) busyDays.push(day);
    else nextSlots[day] = id;
  }

  return { routines, customExercises, weekSlots: nextSlots, busyDays };
}
