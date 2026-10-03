/*
 * Date demo pentru capturile de ecran (scripts/screenshots.mjs). Nu e importat de aplicație,
 * deci nu ajunge în build; scriptul îl încarcă prin serverul de dezvoltare Vite, în modul local.
 * Datele sunt cele din machete (design/round5): Andrei, rutina Upper A, 1.840 kcal azi etc.
 */
import { addDays, localDateStr } from '../lib/date';
import { db, newId, nowIso, type LocalFoodEntry, type LocalRoutine, type LocalWorkoutLog, type RoutineExercise } from '../lib/db';

const synced = () => ({ client_updated_at: nowIso(), sync_status: 'synced' as const, deleted: false });

const UPPER_A: RoutineExercise[] = [
  { exercise_id: 'bench-press', sets: 3, rep_min: 6, rep_max: 8, rest_s: 150, progression: 'double' },
  { exercise_id: 'barbell-row', sets: 3, rep_min: 8, rep_max: 10, rest_s: 120, progression: 'double' },
  { exercise_id: 'overhead-press', sets: 3, rep_min: 6, rep_max: 8, rest_s: 120, progression: 'double' },
  { exercise_id: 'pull-up', sets: 3, rep_min: 5, rep_max: 10, rest_s: 90, linked_to_next: true },
  { exercise_id: 'dips', sets: 3, rep_min: 6, rep_max: 12, rest_s: 90 },
];
const LOWER_A: RoutineExercise[] = [
  { exercise_id: 'back-squat', sets: 3, rep_min: 5, rep_max: 8, rest_s: 180, progression: 'double' },
  { exercise_id: 'deadlift', sets: 2, rep_min: 5, rep_max: 5, rest_s: 180, progression: 'linear' },
];

function at(date: string, hh: number, mm = 0): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

/** Pseudo-aleator stabil, ca fiecare captură să arate la fel. */
function noise(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export async function seedDemo(userId: string, mode: 'full' | 'empty' = 'full'): Promise<void> {
  await db.delete();
  await db.open();
  const today = localDateStr();

  await db.profiles.put({
    user_id: userId,
    full_name: 'Andrei',
    training_split: 'upper_lower',
    nutrition_phase: 'maintenance',
    spine_hygiene_alert: true,
    sex: mode === 'full' ? 'male' : null,
    birth_year: mode === 'full' ? 1990 : null,
    height_cm: mode === 'full' ? 182 : null,
    activity_level: 'moderate',
    kcal_target_override: mode === 'full' ? 2400 : null,
    meal_plan: 'standard',
    long_term_focus: null,
    long_term_also: [],
    effort_scale: 'rir',
    week_starts_on: 'monday',
    favorite_exercise_ids: [],
    week_slots: {},
    week_moves: [],
    client_updated_at: nowIso(),
    sync_status: 'synced',
  });
  if (mode === 'empty') return;

  const upper: LocalRoutine = { id: newId(), user_id: userId, name: 'Upper A', notes: '', exercises: UPPER_A, default_progression: 'double', progression_increment_kg: 2.5, progression_reset_pct: 10, is_deload: false, ...synced() };
  const lower: LocalRoutine = { id: newId(), user_id: userId, name: 'Lower A', notes: '', exercises: LOWER_A, default_progression: 'double', progression_increment_kg: 2.5, progression_reset_pct: 10, is_deload: false, ...synced() };
  await db.routines.bulkPut([upper, lower]);
  // azi Upper A, joi Lower A
  const weekday = ((new Date().getDay() + 6) % 7) + 1;
  await db.profiles.update(userId, { week_slots: { [weekday]: upper.id, [((weekday + 4) % 7) + 1]: lower.id } });

  // 8 săptămâni de forță: Upper / Lower, cu progresie pe împins (90 → 97,5 kg 1RM estimat)
  const logs: LocalWorkoutLog[] = [];
  for (let w = 8; w >= 1; w -= 1) {
    const sessionsThisWeek = w === 3 || w === 7 ? 2 : 3;
    for (let k = 0; k < sessionsThisWeek; k += 1) {
      const day = addDays(today, -w * 7 + 1 + k * 2);
      const routine = k % 2 === 0 ? upper : lower;
      const id = newId();
      await db.workoutSessions.put({ id, user_id: userId, kind: 'strength', name: routine.name, routine_id: routine.id, activity: null, intensity: null, started_at: at(day, 18), ended_at: at(day, 19, 5), notes: '', is_deload: false, ...synced() });
      const bench = 67.5 + Math.floor((8 - w) / 2) * 2.5;
      for (const spec of routine.exercises) {
        for (let s = 0; s < spec.sets; s += 1) {
          const kg = spec.exercise_id === 'bench-press' ? bench : spec.exercise_id === 'barbell-row' ? 62.5 : spec.exercise_id === 'overhead-press' ? 45 : spec.exercise_id === 'back-squat' ? 100 : spec.exercise_id === 'deadlift' ? 130 : 0;
          logs.push({ id: newId(), user_id: userId, session_id: id, exercise_id: spec.exercise_id, exercise_name: '', set_type: 'work', set_order: s, weight_kg: kg, reps: spec.rep_max - s, rpe: null, effort_scale: null, pain_detected: false, logged_at: at(day, 18, 5 + s * 3), ...synced() });
        }
      }
    }
  }
  // ieri seară: Upper (de aceea pieptul și tricepsul sunt încă obosite)
  const yesterday = addDays(today, -1);
  const ySession = newId();
  await db.workoutSessions.put({ id: ySession, user_id: userId, kind: 'strength', name: 'Upper B', routine_id: null, activity: null, intensity: null, started_at: at(yesterday, 18), ended_at: at(yesterday, 19), notes: '', is_deload: false, ...synced() });
  for (const [ex, kg] of [['bench-press', 80], ['close-grip-bench', 65], ['dips', 0]] as const) {
    for (let s = 0; s < 4; s += 1) {
      logs.push({ id: newId(), user_id: userId, session_id: ySession, exercise_id: ex, exercise_name: '', set_type: 'work', set_order: s, weight_kg: kg, reps: 8, rpe: 1, effort_scale: 'rir', pain_detected: false, logged_at: at(yesterday, 18, 5 + s * 3), ...synced() });
    }
  }
  await db.workoutLogs.bulkPut(logs);

  // greutate: 30 de zile, trend −0,6 kg, cu zgomot zilnic de apă
  for (let i = 40; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    await db.nutritionLogs.put({ user_id: userId, log_date: day, body_weight_kg: Math.round((82.4 + i * 0.02 + noise(i) * 0.6) * 10) / 10, water_ml: i === 0 ? 1250 : 2250, sugar_free_respected: null, flour_free_respected: null, client_updated_at: nowIso(), sync_status: 'synced' });
  }
  await db.nutritionLogs.update([userId, today], { body_weight_kg: 82.4 });

  // mâncare: 4 săptămâni în jur de 2.250 kcal; azi 1.840 (fără cină)
  const entries: LocalFoodEntry[] = [];
  const food = (date: string, meal: LocalFoodEntry['meal'], name: string, amount: string, kcal: number, p: number, c: number, f: number): LocalFoodEntry => ({
    id: newId(), user_id: userId, log_date: date, meal, name, amount_text: amount, kcal, protein: p, carbs: c, fat: f, fiber: 4, sugar: 6, sodium: 300, source: 'builtin', logged_at: at(date, meal === 'breakfast' ? 8 : meal === 'lunch' ? 13 : meal === 'snack' ? 16 : 20), ...synced(),
  });
  for (let i = 27; i >= 1; i -= 1) {
    const day = addDays(today, -i);
    const k = Math.round(2250 + noise(i + 100) * 500);
    entries.push(food(day, 'breakfast', 'Iaurt grecesc cu ovăz și afine', '250 g', 420, 32, 48, 10));
    entries.push(food(day, 'lunch', 'Piept de pui cu orez și salată', '1 porție', 680, 52, 75, 16));
    entries.push(food(day, 'dinner', 'Somon cu cartofi și broccoli', '1 porție', k - 1340, 40, 60, 30));
    entries.push(food(day, 'snack', 'Măr și migdale', '1 măr, 20 g', 240, 6, 25, 14));
  }
  entries.push(food(today, 'breakfast', 'Iaurt grecesc cu ovăz și afine', '250 g', 420, 32, 48, 10));
  entries.push(food(today, 'lunch', 'Piept de pui cu orez și salată', '1 porție', 680, 52, 75, 16));
  entries.push(food(today, 'snack', 'Măr și migdale', '1 măr, 20 g', 240, 6, 25, 14));
  entries.push(food(today, 'snack', 'Shake proteic cu banană', '1 porție', 500, 38, 42, 22));
  await db.foodEntries.bulkPut(entries);

  // mișcare: pauza de birou, acum 2 zile
  const two = addDays(today, -2);
  await db.healthSessions.put({ id: newId(), user_id: userId, program_id: 'desk-break', started_at: at(two, 11), completed_at: at(two, 11, 3), duration_s: 180, pain_before: null, pain_after: null, stopped_for_pain: false, ...synced() });
}
