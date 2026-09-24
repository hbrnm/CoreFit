export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band' | 'other';

/** reps = greutate x repetări; bodyweight = repetări (opțional greutate adăugată); duration = secunde. */
export type ExerciseKind = 'reps' | 'bodyweight' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  kind: ExerciseKind;
  /** grupe care ajută, doar unde rolul e standard; izolările nu au */
  synergists?: Muscle[];
  custom?: boolean;
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Piept',
  back: 'Spate',
  shoulders: 'Umeri',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Cvadricepși',
  hamstrings: 'Femurali',
  glutes: 'Fesieri',
  calves: 'Gambe',
  core: 'Abdomen și trunchi',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Bară',
  dumbbell: 'Gantere',
  machine: 'Aparat',
  cable: 'Cablu',
  bodyweight: 'Greutatea corpului',
  band: 'Bandă elastică',
  other: 'Altele',
};

type Row = [id: string, name: string, muscle: Muscle, equipment: Equipment, kind: ExerciseKind];

const ROWS: Row[] = [
  // piept
  ['bench-press', 'Barbell Bench Press', 'chest', 'barbell', 'reps'],
  ['incline-bench', 'Incline Barbell Bench Press', 'chest', 'barbell', 'reps'],
  ['db-bench', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'reps'],
  ['incline-db-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', 'reps'],
  ['machine-chest-press', 'Machine Chest Press', 'chest', 'machine', 'reps'],
  ['db-fly', 'Dumbbell Fly', 'chest', 'dumbbell', 'reps'],
  ['cable-fly', 'Cable Fly', 'chest', 'cable', 'reps'],
  ['push-up', 'Push-up', 'chest', 'bodyweight', 'bodyweight'],
  ['dips', 'Dips', 'chest', 'bodyweight', 'bodyweight'],
  // spate
  ['deadlift', 'Deadlift', 'back', 'barbell', 'reps'],
  ['pull-up', 'Pull-up', 'back', 'bodyweight', 'bodyweight'],
  ['chin-up', 'Chin-up', 'back', 'bodyweight', 'bodyweight'],
  ['lat-pulldown', 'Lat Pulldown', 'back', 'cable', 'reps'],
  ['barbell-row', 'Barbell Row', 'back', 'barbell', 'reps'],
  ['db-row', 'One-arm Dumbbell Row', 'back', 'dumbbell', 'reps'],
  ['seated-cable-row', 'Seated Cable Row', 'back', 'cable', 'reps'],
  ['inverted-row', 'Inverted Row', 'back', 'bodyweight', 'bodyweight'],
  ['back-extension', 'Back Extension', 'back', 'bodyweight', 'bodyweight'],
  // umeri
  ['overhead-press', 'Overhead Press', 'shoulders', 'barbell', 'reps'],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'reps'],
  ['lateral-raise', 'Lateral Raise', 'shoulders', 'dumbbell', 'reps'],
  ['rear-delt-fly', 'Rear Delt Fly', 'shoulders', 'dumbbell', 'reps'],
  ['face-pull', 'Face Pull', 'shoulders', 'cable', 'reps'],
  ['shrug', 'Barbell Shrug', 'shoulders', 'barbell', 'reps'],
  // biceps
  ['barbell-curl', 'Barbell Curl', 'biceps', 'barbell', 'reps'],
  ['db-curl', 'Dumbbell Curl', 'biceps', 'dumbbell', 'reps'],
  ['hammer-curl', 'Hammer Curl', 'biceps', 'dumbbell', 'reps'],
  ['cable-curl', 'Cable Curl', 'biceps', 'cable', 'reps'],
  // triceps
  ['triceps-pushdown', 'Triceps Pushdown', 'triceps', 'cable', 'reps'],
  ['skull-crusher', 'Skull Crusher', 'triceps', 'barbell', 'reps'],
  ['overhead-triceps', 'Overhead Triceps Extension', 'triceps', 'dumbbell', 'reps'],
  ['close-grip-bench', 'Close-grip Bench Press', 'triceps', 'barbell', 'reps'],
  // cvadricepși
  ['back-squat', 'Barbell Back Squat', 'quads', 'barbell', 'reps'],
  ['front-squat', 'Front Squat', 'quads', 'barbell', 'reps'],
  ['goblet-squat', 'Goblet Squat', 'quads', 'dumbbell', 'reps'],
  ['bodyweight-squat', 'Bodyweight Squat', 'quads', 'bodyweight', 'bodyweight'],
  ['leg-press', 'Leg Press', 'quads', 'machine', 'reps'],
  ['leg-extension', 'Leg Extension', 'quads', 'machine', 'reps'],
  ['lunge', 'Walking Lunge', 'quads', 'dumbbell', 'reps'],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', 'dumbbell', 'reps'],
  ['step-up', 'Step-up', 'quads', 'dumbbell', 'reps'],
  // femurali
  ['romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'barbell', 'reps'],
  ['leg-curl', 'Lying Leg Curl', 'hamstrings', 'machine', 'reps'],
  ['seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'machine', 'reps'],
  // fesieri
  ['hip-thrust', 'Barbell Hip Thrust', 'glutes', 'barbell', 'reps'],
  ['glute-bridge', 'Glute Bridge', 'glutes', 'bodyweight', 'bodyweight'],
  ['hip-abduction', 'Hip Abduction Machine', 'glutes', 'machine', 'reps'],
  // gambe
  ['standing-calf-raise', 'Standing Calf Raise', 'calves', 'machine', 'reps'],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', 'machine', 'reps'],
  // abdomen
  ['plank', 'Plank', 'core', 'bodyweight', 'duration'],
  ['side-plank', 'Side Plank', 'core', 'bodyweight', 'duration'],
  ['dead-bug', 'Dead Bug', 'core', 'bodyweight', 'bodyweight'],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'core', 'bodyweight', 'bodyweight'],
  ['cable-crunch', 'Cable Crunch', 'core', 'cable', 'reps'],
  ['ab-wheel', 'Ab Wheel Rollout', 'core', 'other', 'bodyweight'],
];

/**
 * Doar compușii la care grupa ajutătoare e rolul clasic (apăsare, tragere, genuflexiune).
 * Nu e un model EMG și nu acoperă izolările.
 */
const SYNERGISTS: Partial<Record<string, Muscle[]>> = {
  'bench-press': ['triceps', 'shoulders'],
  'incline-bench': ['shoulders', 'triceps'],
  'db-bench': ['triceps', 'shoulders'],
  'incline-db-press': ['shoulders', 'triceps'],
  'push-up': ['triceps', 'shoulders'],
  dips: ['triceps', 'shoulders'],
  'close-grip-bench': ['chest', 'shoulders'],
  deadlift: ['glutes', 'hamstrings'],
  'pull-up': ['biceps'],
  'chin-up': ['biceps'],
  'lat-pulldown': ['biceps'],
  'barbell-row': ['biceps'],
  'db-row': ['biceps'],
  'seated-cable-row': ['biceps'],
  'inverted-row': ['biceps'],
  'overhead-press': ['triceps'],
  'db-shoulder-press': ['triceps'],
  'back-squat': ['glutes'],
  'front-squat': ['glutes', 'core'],
  'goblet-squat': ['glutes'],
  'bodyweight-squat': ['glutes'],
  'leg-press': ['glutes'],
  lunge: ['glutes'],
  'bulgarian-split-squat': ['glutes'],
  'step-up': ['glutes'],
  'romanian-deadlift': ['glutes'],
  'hip-thrust': ['hamstrings'],
};

export const BUILTIN_EXERCISES: Exercise[] = ROWS.map(([id, name, muscle, equipment, kind]) => ({
  id,
  name,
  muscle,
  equipment,
  kind,
  synergists: SYNERGISTS[id],
}));

const BY_ID = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]));

export function builtinExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
