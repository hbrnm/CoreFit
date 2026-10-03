import type { Exercise, ExerciseKind, Muscle } from '../data/exercises';
import type { LocalCustomExercise, LocalWorkoutLog, LocalWorkoutSession, Synced } from './db';
import { guessEquipment, matchExercise, muscleFromCategory, normalizeName } from './exerciseMatch';
import { stableId, type ParsedImport } from './importCsv';

/*
 * Ce ar scrie un import în baza locală, calculat fără să scrie nimic: se arată întâi
 * utilizatorului, apoi importOps.applyImport îl salvează.
 */

export interface ImportPlan {
  sessions: LocalWorkoutSession[];
  logs: LocalWorkoutLog[];
  /** exerciții proprii create acum, pentru numele fără potrivire în catalog */
  newCustom: LocalCustomExercise[];
  /** numele din fișier potrivite cu catalogul sau cu exercițiile tale: nume din fișier → nume CoreFit */
  matched: Array<{ from: string; to: string }>;
  /** grupa e pusă implicit (core) pentru aceste exerciții noi: merită verificată */
  guessedMuscle: string[];
}

/** Grupa pusă când fișierul nu o spune. Exercițiul se poate edita după import. */
const FALLBACK_MUSCLE: Muscle = 'core';

function kindOf(sets: ParsedImport['workouts'][number]['sets']): ExerciseKind {
  if (sets.some((s) => s.timed)) return 'duration';
  if (sets.every((s) => s.weightKg === 0)) return 'bodyweight';
  return 'reps';
}

export async function planImport(
  parsed: ParsedImport,
  userId: string,
  catalog: readonly Exercise[],
  existingCustom: readonly LocalCustomExercise[],
  synced: Synced,
): Promise<ImportPlan> {
  const customByName = new Map(existingCustom.filter((c) => !c.deleted).map((c) => [normalizeName(c.name), c]));
  const resolved = new Map<string, { id: string; name: string }>();
  const newCustom: LocalCustomExercise[] = [];
  const matched: ImportPlan['matched'] = [];
  const guessedMuscle: string[] = [];

  const allSets = parsed.workouts.flatMap((w) => w.sets.map((s) => ({ ...s, category: w.categories[s.exerciseName] })));
  for (const name of new Set(allSets.map((s) => s.exerciseName))) {
    const own = customByName.get(normalizeName(name));
    const builtin = own ? null : matchExercise(name, catalog);
    if (own || builtin) {
      const target = own ?? (builtin as Exercise);
      resolved.set(name, { id: target.id, name: target.name });
      matched.push({ from: name, to: target.name });
      continue;
    }
    const sets = allSets.filter((s) => s.exerciseName === name);
    const muscle = muscleFromCategory(sets.find((s) => s.category)?.category);
    if (!muscle) guessedMuscle.push(name);
    const custom: LocalCustomExercise = {
      id: await stableId('import-custom', userId, normalizeName(name)),
      user_id: userId,
      name,
      muscle: muscle ?? FALLBACK_MUSCLE,
      equipment: guessEquipment(name),
      kind: kindOf(sets),
      deleted: false,
      ...synced,
    };
    newCustom.push(custom);
    resolved.set(name, { id: custom.id, name: custom.name });
  }

  const sessions: LocalWorkoutSession[] = [];
  const logs: LocalWorkoutLog[] = [];
  for (const w of parsed.workouts) {
    const sessionId = await stableId('import', userId, w.key);
    sessions.push({
      id: sessionId,
      user_id: userId,
      kind: 'strength',
      name: w.name,
      routine_id: null,
      activity: null,
      intensity: null,
      started_at: w.startedAt.toISOString(),
      ended_at: w.endedAt.toISOString(),
      notes: w.notes,
      is_deload: false,
      deleted: false,
      ...synced,
    });
    const seen = new Map<string, number>();
    for (const [order, s] of w.sets.entries()) {
      const nth = seen.get(s.exerciseName) ?? 0;
      seen.set(s.exerciseName, nth + 1);
      const target = resolved.get(s.exerciseName) as { id: string; name: string };
      logs.push({
        id: await stableId('import', userId, w.key, s.exerciseName, String(nth)),
        user_id: userId,
        session_id: sessionId,
        exercise_id: target.id,
        exercise_name: target.name,
        set_type: s.setType,
        set_order: order,
        weight_kg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        effort_scale: s.rpe === null ? null : 'rpe',
        pain_detected: false,
        // în ordine, în timpul antrenamentului, ca istoricul și progresia să le vadă corect
        logged_at: new Date(w.startedAt.getTime() + (order + 1) * 1000).toISOString(),
        deleted: false,
        ...synced,
      });
    }
  }

  return { sessions, logs, newCustom, matched, guessedMuscle };
}
