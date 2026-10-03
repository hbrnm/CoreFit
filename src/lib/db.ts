import type { SetType } from './setTypes';
import Dexie, { type Table } from 'dexie';
import type { Muscle, Equipment, ExerciseKind } from '../data/exercises';
import { BUILTIN_EXERCISES } from '../data/exercises';
import type { ProgressionKind } from './progression';

export type SyncStatus = 'pending' | 'synced' | 'error';
export type TrainingSplit = 'full_body' | 'upper_lower' | 'body_part' | 'bbls_5day';
export type NutritionPhase = 'cutting' | 'bulking' | 'maintenance' | 'sugar_free_reset';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
/** Cum se împarte ținta zilnică pe mese. Rămâne pe dispozitiv (nu e coloană în cloud). */
export type MealPlan = 'standard' | 'mediterranean' | 'two_meal' | 'omad' | 'five_small';
/** Prioritate aleasă de utilizator. null = nu presupunem nimic din vârstă. */
export type LongTermFocus =
  | 'strength'
  | 'cut_keep_muscle'
  | 'fitness'
  | 'mobility'
  | 'general_health'
  | 'capacity';
export type PreventionId = 'bp' | 'dental' | 'vision' | 'hearing' | 'vaccines' | 'screening';
export type EffortScale = 'rir' | 'rpe';
export type WeekStartsOn = 'monday' | 'sunday';
export type IsoWeekday = '1' | '2' | '3' | '4' | '5' | '6' | '7';

/** Mutare doar pentru o săptămână. Nu schimbă rutina fixă. */
export interface WeekMove {
  id: string;
  /** prima zi a săptămânii, în formatul ales de utilizator */
  week_of: string;
  from_date: string;
  to_date: string;
  routine_id: string;
}
export type FoodSource = 'builtin' | 'off' | 'custom' | 'recipe' | 'quick';
export type RegionId =
  | 'lower_back'
  | 'thoracic'
  | 'neck'
  | 'shoulder'
  | 'hip'
  | 'knee'
  | 'ankle_foot'
  | 'other';

/** Câmpurile comune tuturor rândurilor sincronizate. */
export interface Synced {
  client_updated_at: string;
  sync_status: SyncStatus;
}

/** Rând cu id generat pe client, șters "soft". */
export interface Owned extends Synced {
  id: string;
  user_id: string;
  deleted: boolean;
}

export interface LocalProfile extends Synced {
  user_id: string;
  full_name: string;
  training_split: TrainingSplit;
  nutrition_phase: NutritionPhase;
  spine_hygiene_alert: boolean;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  /** țintă de calorii setată manual; null = calculată automat */
  kcal_target_override: number | null;
  /** împărțirea caloriilor pe mese; implicit standard */
  meal_plan: MealPlan;
  /** prioritatea principală pe termen lung; null = nealeasă */
  long_term_focus: LongTermFocus | null;
  /** priorități secundare, fără duplicarea celei principale */
  long_term_also: LongTermFocus[];
  /** scara preferată la notare; nu schimbă seriile deja salvate */
  effort_scale: EffortScale;
  week_starts_on: WeekStartsOn;
  favorite_exercise_ids: string[];
  /** zi ISO (1=luni) → id rutină, planul care se repetă */
  week_slots: Partial<Record<IsoWeekday, string>>;
  week_moves: WeekMove[];
}

// ------------------------------------------------------------------ antrenament

export interface LocalWorkoutSession extends Owned {
  kind: 'strength' | 'cardio';
  name: string;
  routine_id: string | null;
  /** doar pentru cardio: mers, alergare, bicicletă etc. */
  activity: string | null;
  intensity: 'moderate' | 'vigorous' | null;
  started_at: string;
  /** null = antrenament în curs */
  ended_at: string | null;
  notes: string;
  /** sesiune de deload: nu contează ca bază pentru progresia automată */
  is_deload: boolean;
}

export interface LocalWorkoutLog extends Owned {
  session_id: string | null;
  exercise_id: string;
  exercise_name: string;
  /** încălzire, normală, drop set, până la eșec: vezi lib/setTypes.ts */
  set_type: SetType;
  set_order: number;
  weight_kg: number;
  /** repetări, sau secunde pentru exercițiile cu durată */
  reps: number;
  /** valoarea pe scara din effort_scale; null = nenotat */
  rpe: number | null;
  effort_scale: EffortScale | null;
  pain_detected: boolean;
  logged_at: string;
}

export interface RoutineExercise {
  exercise_id: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  rest_s: number;
  /** absent = folosește regula implicită a rutinei */
  progression?: ProgressionKind;
  /** true = acest exercițiu și următorul din listă formează un superset (fără pauză între ele) */
  linked_to_next?: boolean;
}

export interface LocalRoutine extends Owned {
  name: string;
  notes: string;
  exercises: RoutineExercise[];
  default_progression: ProgressionKind;
  progression_increment_kg: number;
  /** procent, doar pentru regula Greyskull */
  progression_reset_pct: number;
  /** rutină de deload: sesiunile ei nu avansează progresia altor sesiuni */
  is_deload: boolean;
}

export interface LocalCustomExercise extends Owned {
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  kind: ExerciseKind;
}

// ------------------------------------------------------------------ sănătate

export interface LocalSpineAssessment extends Owned {
  assessed_at: string;
  flexion_intolerant: boolean;
  extension_intolerant: boolean;
  compression_intolerant: boolean;
  active_scab_picking_identified: boolean;
  recommended_movement: string;
}

export interface LocalPainLog extends Owned {
  region: RegionId;
  /** 0-10 */
  score: number;
  note: string;
  logged_at: string;
}

export interface LocalHealthSession extends Owned {
  program_id: string;
  started_at: string;
  completed_at: string;
  duration_s: number;
  pain_before: number | null;
  pain_after: number | null;
  stopped_for_pain: boolean;
}

/**
 * Checklistul zilnic pentru coloană: ce mișcări de igienă a spatelui ai făcut azi.
 * Un rând pe zi și utilizator, ca jurnalul de nutriție: cheia este (user_id, log_date).
 */
export interface LocalSpineChecklist extends Synced {
  user_id: string;
  log_date: string;
  /** id-urile din data/spineChecklist.ts bifate în ziua respectivă */
  done: string[];
}

// ------------------------------------------------------------------ nutriție

/** Un rând pe zi și utilizator: cheia primară este (user_id, log_date). */
export interface LocalNutritionLog extends Synced {
  user_id: string;
  log_date: string; // YYYY-MM-DD, data locală
  body_weight_kg: number | null;
  water_ml: number;
  /** null = ziua nu a fost evaluată pentru provocarea fără zahăr și făină */
  sugar_free_respected: boolean | null;
  flour_free_respected: boolean | null;
}

export interface LocalFoodEntry extends Owned {
  log_date: string;
  meal: Meal;
  name: string;
  /** ex. "150 g" sau "1,5 porții": textul afișat */
  amount_text: string;
  /** cantitatea în grame (sau ml), când se cunoaște; null la porții și adăugare rapidă */
  grams: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  /** miligrame; lipsește la intrările vechi */
  sodium?: number;
  source: FoodSource;
  logged_at: string;
}

export interface Per100 {
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
  sugar100: number;
  /** miligrame de sodiu la 100 g; lipsește la alimentele fără etichetă */
  sodium100?: number;
}

export interface LocalCustomFood extends Owned, Per100 {
  name: string;
  brand: string;
  barcode: string | null;
  serving_g: number | null;
}

export interface RecipeIngredient extends Per100 {
  name: string;
  /** greutatea crudă, în grame */
  grams: number;
}

export interface LocalRecipe extends Owned {
  name: string;
  servings: number;
  /** greutatea totală după gătit; null = necunoscută */
  cooked_weight_g: number | null;
  ingredients: RecipeIngredient[];
  notes: string;
}

/** Bifa organizatorică „am verificat / am discutat”, nu un rezultat medical. */
export interface LocalPreventionMark extends Owned {
  item_id: PreventionId;
  marked_on: string;
  note: string;
}

// ------------------------------------------------------------------ baza de date

export class CoreFitDB extends Dexie {
  profiles!: Table<LocalProfile, string>;
  workoutSessions!: Table<LocalWorkoutSession, string>;
  workoutLogs!: Table<LocalWorkoutLog, string>;
  routines!: Table<LocalRoutine, string>;
  customExercises!: Table<LocalCustomExercise, string>;
  spineAssessments!: Table<LocalSpineAssessment, string>;
  painLogs!: Table<LocalPainLog, string>;
  healthSessions!: Table<LocalHealthSession, string>;
  nutritionLogs!: Table<LocalNutritionLog, [string, string]>;
  foodEntries!: Table<LocalFoodEntry, string>;
  customFoods!: Table<LocalCustomFood, string>;
  recipes!: Table<LocalRecipe, string>;
  preventionMarks!: Table<LocalPreventionMark, string>;
  spineChecklists!: Table<LocalSpineChecklist, [string, string]>;

  constructor() {
    super('corefit-local');

    this.version(1).stores({
      profiles: 'user_id, sync_status',
      workoutLogs: 'id, user_id, sync_status, [user_id+logged_at]',
      nutritionLogs: '[user_id+log_date], user_id, sync_status',
      spineAssessments: 'id, user_id, sync_status, [user_id+assessed_at]',
    });

    this.version(2)
      .stores({
        workoutSessions: 'id, user_id, sync_status, [user_id+started_at]',
        workoutLogs: 'id, user_id, sync_status, session_id, [user_id+logged_at]',
        routines: 'id, user_id, sync_status',
        customExercises: 'id, user_id, sync_status',
        painLogs: 'id, user_id, sync_status, [user_id+logged_at]',
        healthSessions: 'id, user_id, sync_status, [user_id+completed_at]',
        foodEntries: 'id, user_id, sync_status, [user_id+log_date]',
        customFoods: 'id, user_id, sync_status',
        recipes: 'id, user_id, sync_status',
      })
      .upgrade(async (tx) => {
        const now = new Date().toISOString();
        const byName = new Map(BUILTIN_EXERCISES.map((e) => [e.en ?? e.name, e.id]));

        await tx
          .table('profiles')
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            p.sex ??= null;
            p.birth_year ??= null;
            p.height_cm ??= null;
            p.activity_level ??= 'light';
            p.kcal_target_override ??= null;
          });

        await tx
          .table('workoutLogs')
          .toCollection()
          .modify((l: Record<string, unknown>) => {
            l.session_id ??= null;
            l.set_order ??= 0;
            l.exercise_id ??= byName.get(String(l.exercise_name)) ?? `name:${String(l.exercise_name)}`;
            if (l.set_type !== 'warmup') l.set_type = 'work';
            l.sync_status = 'pending';
          });

        await tx
          .table('spineAssessments')
          .toCollection()
          .modify((a: Record<string, unknown>) => {
            a.deleted ??= false;
            a.client_updated_at ??= now;
          });

        await tx
          .table('nutritionLogs')
          .toCollection()
          .modify((n: Record<string, unknown>) => {
            delete n.protein_grams;
            delete n.carbs_grams;
            delete n.fat_grams;
            delete n.fiber_grams;
            n.water_ml ??= 0;
            n.sync_status = 'pending';
          });
      });

    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('routines')
          .toCollection()
          .modify((r: Record<string, unknown>) => {
            r.default_progression ??= 'none';
            r.progression_increment_kg ??= 2.5;
            r.progression_reset_pct ??= 0.1;
            r.is_deload ??= false;
            r.sync_status = 'pending';
          });

        await tx
          .table('workoutSessions')
          .toCollection()
          .modify((s: Record<string, unknown>) => {
            s.is_deload ??= false;
            s.sync_status = 'pending';
          });
      });

    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('profiles')
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            p.meal_plan ??= 'standard';
          });
      });

    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('foodEntries')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            e.sodium ??= 0;
          });
        await tx
          .table('customFoods')
          .toCollection()
          .modify((f: Record<string, unknown>) => {
            f.sodium100 ??= 0;
          });
      });

    this.version(6)
      .stores({
        preventionMarks: 'id, user_id, sync_status, item_id, [user_id+item_id]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('profiles')
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            p.long_term_focus ??= null;
            if (!Array.isArray(p.long_term_also)) p.long_term_also = [];
          });
      });

    this.version(7)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('profiles')
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            p.effort_scale ??= 'rir';
            p.week_starts_on ??= 'monday';
            if (!Array.isArray(p.favorite_exercise_ids)) p.favorite_exercise_ids = [];
            if (p.week_slots == null || typeof p.week_slots !== 'object') p.week_slots = {};
            if (!Array.isArray(p.week_moves)) p.week_moves = [];
          });
        await tx
          .table('workoutLogs')
          .toCollection()
          .modify((l: Record<string, unknown>) => {
            l.effort_scale ??= null;
          });
      });

    // Modulul 1: checklistul zilnic al coloanei; alimentele primesc gramajul numeric
    this.version(8)
      .stores({
        spineChecklists: '[user_id+log_date], user_id, sync_status',
      })
      .upgrade(async (tx) => {
        await tx
          .table('foodEntries')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            e.grams ??= gramsFromAmountText(String(e.amount_text ?? ''));
          });
      });
  }
}

export const db = new CoreFitDB();

// ------------------------------------------------------------------ utilitare

export const newId = (): string => crypto.randomUUID();

/** „150 g” → 150, „1,5 porții” → null: pentru intrările vechi, fără gramaj numeric. */
export function gramsFromAmountText(text: string): number | null {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\s*$/i.exec(text);
  return m ? Number(m[1].replace(',', '.')) : null;
}
export const nowIso = (): string => new Date().toISOString();

/** Marchează un rând ca modificat local: se va trimite la următoarea sincronizare. */
export function stamp(): Synced {
  return { client_updated_at: nowIso(), sync_status: 'pending' };
}

export function defaultProfile(userId: string): LocalProfile {
  return {
    user_id: userId,
    full_name: '',
    training_split: 'upper_lower',
    nutrition_phase: 'maintenance',
    spine_hygiene_alert: true,
    sex: null,
    birth_year: null,
    height_cm: null,
    activity_level: 'light',
    kcal_target_override: null,
    meal_plan: 'standard',
    long_term_focus: null,
    long_term_also: [],
    effort_scale: 'rir',
    week_starts_on: 'monday',
    favorite_exercise_ids: [],
    week_slots: {},
    week_moves: [],
    client_updated_at: nowIso(),
    // "synced" înseamnă că nu se trimite nimic până când utilizatorul editează profilul;
    // astfel un profil implicit gol nu suprascrie niciodată profilul real de pe server.
    sync_status: 'synced',
  };
}

export async function ensureProfile(userId: string): Promise<void> {
  await db.transaction('rw', db.profiles, async () => {
    const existing = await db.profiles.get(userId);
    if (!existing) await db.profiles.put(defaultProfile(userId));
  });
}

export async function saveProfilePatch(userId: string, patch: Partial<LocalProfile>): Promise<void> {
  const current = await db.profiles.get(userId);
  if (!current) return;
  await db.profiles.put({ ...current, ...patch, ...stamp() });
}
