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
  /** repetările (sau secundele) se notează pe o singură parte: "8 pe parte" */
  perSide?: boolean;
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

  // ------------------------------------------------------------- extinderea catalogului (fără ilustrații)
  // piept
  ['decline-bench', 'Decline Barbell Bench Press', 'chest', 'barbell', 'reps'],
  ['smith-bench', 'Smith Machine Bench Press', 'chest', 'machine', 'reps'],
  ['incline-db-fly', 'Incline Dumbbell Fly', 'chest', 'dumbbell', 'reps'],
  ['pec-deck', 'Pec Deck', 'chest', 'machine', 'reps'],
  ['db-pullover', 'Dumbbell Pullover', 'chest', 'dumbbell', 'reps'],
  ['incline-push-up', 'Incline Push-up', 'chest', 'bodyweight', 'bodyweight'],
  // spate
  ['rack-pull', 'Rack Pull', 'back', 'barbell', 'reps'],
  ['pendlay-row', 'Pendlay Row', 'back', 'barbell', 'reps'],
  ['t-bar-row', 'T-Bar Row', 'back', 'barbell', 'reps'],
  ['chest-supported-row', 'Chest-supported Dumbbell Row', 'back', 'dumbbell', 'reps'],
  ['machine-row', 'Machine Row', 'back', 'machine', 'reps'],
  ['single-arm-cable-row', 'Single-arm Cable Row', 'back', 'cable', 'reps'],
  ['straight-arm-pulldown', 'Straight-arm Pulldown', 'back', 'cable', 'reps'],
  ['assisted-pull-up', 'Assisted Pull-up Machine', 'back', 'machine', 'reps'],
  ['superman', 'Superman', 'back', 'bodyweight', 'bodyweight'],
  // umeri
  ['arnold-press', 'Arnold Press', 'shoulders', 'dumbbell', 'reps'],
  ['machine-shoulder-press', 'Machine Shoulder Press', 'shoulders', 'machine', 'reps'],
  ['landmine-press', 'Landmine Press', 'shoulders', 'barbell', 'reps'],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', 'cable', 'reps'],
  ['front-raise', 'Dumbbell Front Raise', 'shoulders', 'dumbbell', 'reps'],
  ['upright-row', 'Upright Row', 'shoulders', 'barbell', 'reps'],
  ['reverse-pec-deck', 'Reverse Pec Deck', 'shoulders', 'machine', 'reps'],
  ['band-pull-apart', 'Band Pull-apart', 'shoulders', 'band', 'reps'],
  ['pike-push-up', 'Pike Push-up', 'shoulders', 'bodyweight', 'bodyweight'],
  ['db-shrug', 'Dumbbell Shrug', 'shoulders', 'dumbbell', 'reps'],
  // biceps
  ['ez-bar-curl', 'EZ-bar Curl', 'biceps', 'barbell', 'reps'],
  ['preacher-curl', 'Preacher Curl', 'biceps', 'barbell', 'reps'],
  ['incline-db-curl', 'Incline Dumbbell Curl', 'biceps', 'dumbbell', 'reps'],
  ['concentration-curl', 'Concentration Curl', 'biceps', 'dumbbell', 'reps'],
  ['band-curl', 'Band Curl', 'biceps', 'band', 'reps'],
  // triceps
  ['rope-pushdown', 'Rope Triceps Pushdown', 'triceps', 'cable', 'reps'],
  ['overhead-cable-extension', 'Overhead Cable Triceps Extension', 'triceps', 'cable', 'reps'],
  ['db-kickback', 'Dumbbell Triceps Kickback', 'triceps', 'dumbbell', 'reps'],
  ['bench-dip', 'Bench Dip', 'triceps', 'bodyweight', 'bodyweight'],
  ['diamond-push-up', 'Diamond Push-up', 'triceps', 'bodyweight', 'bodyweight'],
  // cvadricepși
  ['hack-squat', 'Hack Squat', 'quads', 'machine', 'reps'],
  ['smith-squat', 'Smith Machine Squat', 'quads', 'machine', 'reps'],
  ['reverse-lunge', 'Dumbbell Reverse Lunge', 'quads', 'dumbbell', 'reps'],
  ['split-squat', 'Dumbbell Split Squat', 'quads', 'dumbbell', 'reps'],
  ['pistol-squat', 'Pistol Squat', 'quads', 'bodyweight', 'bodyweight'],
  ['wall-sit', 'Wall Sit', 'quads', 'bodyweight', 'duration'],
  // femurali
  ['stiff-leg-deadlift', 'Stiff-leg Deadlift', 'hamstrings', 'barbell', 'reps'],
  ['db-rdl', 'Dumbbell Romanian Deadlift', 'hamstrings', 'dumbbell', 'reps'],
  ['single-leg-rdl', 'Single-leg Romanian Deadlift', 'hamstrings', 'dumbbell', 'reps'],
  ['good-morning', 'Good Morning', 'hamstrings', 'barbell', 'reps'],
  ['nordic-curl', 'Nordic Hamstring Curl', 'hamstrings', 'bodyweight', 'bodyweight'],
  ['glute-ham-raise', 'Glute-Ham Raise', 'hamstrings', 'bodyweight', 'bodyweight'],
  // fesieri
  ['sumo-deadlift', 'Sumo Deadlift', 'glutes', 'barbell', 'reps'],
  ['kettlebell-swing', 'Kettlebell Swing', 'glutes', 'other', 'reps'],
  ['hip-thrust-machine', 'Hip Thrust Machine', 'glutes', 'machine', 'reps'],
  ['cable-kickback', 'Cable Glute Kickback', 'glutes', 'cable', 'reps'],
  ['single-leg-glute-bridge', 'Single-leg Glute Bridge', 'glutes', 'bodyweight', 'bodyweight'],
  // gambe
  ['single-leg-calf-raise', 'Single-leg Calf Raise', 'calves', 'bodyweight', 'bodyweight'],
  ['leg-press-calf-raise', 'Leg Press Calf Raise', 'calves', 'machine', 'reps'],
  // abdomen
  ['crunch', 'Crunch', 'core', 'bodyweight', 'bodyweight'],
  ['reverse-crunch', 'Reverse Crunch', 'core', 'bodyweight', 'bodyweight'],
  ['sit-up', 'Sit-up', 'core', 'bodyweight', 'bodyweight'],
  ['russian-twist', 'Russian Twist', 'core', 'bodyweight', 'bodyweight'],
  ['hollow-hold', 'Hollow Body Hold', 'core', 'bodyweight', 'duration'],
  ['l-sit', 'L-sit', 'core', 'bodyweight', 'duration'],
  ['bird-dog', 'Bird Dog', 'core', 'bodyweight', 'bodyweight'],
  ['pallof-press', 'Pallof Press', 'core', 'cable', 'reps'],
  ['cable-woodchop', 'Cable Woodchop', 'core', 'cable', 'reps'],
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
  'decline-bench': ['triceps', 'shoulders'],
  'smith-bench': ['triceps', 'shoulders'],
  'incline-push-up': ['triceps', 'shoulders'],
  'rack-pull': ['glutes', 'hamstrings'],
  'pendlay-row': ['biceps'],
  't-bar-row': ['biceps'],
  'chest-supported-row': ['biceps'],
  'machine-row': ['biceps'],
  'single-arm-cable-row': ['biceps'],
  'assisted-pull-up': ['biceps'],
  'arnold-press': ['triceps'],
  'machine-shoulder-press': ['triceps'],
  'landmine-press': ['triceps', 'chest'],
  'pike-push-up': ['triceps'],
  'bench-dip': ['shoulders'],
  'diamond-push-up': ['chest', 'shoulders'],
  'hack-squat': ['glutes'],
  'smith-squat': ['glutes'],
  'reverse-lunge': ['glutes'],
  'split-squat': ['glutes'],
  'pistol-squat': ['glutes'],
  'stiff-leg-deadlift': ['glutes'],
  'db-rdl': ['glutes'],
  'single-leg-rdl': ['glutes'],
  'good-morning': ['glutes', 'back'],
  'glute-ham-raise': ['glutes'],
  'sumo-deadlift': ['quads', 'hamstrings'],
  'kettlebell-swing': ['hamstrings'],
  'single-leg-glute-bridge': ['hamstrings'],
};

/** Exerciții unilaterale: se lucrează pe rând fiecare parte, iar valoarea notată e pe o parte. */
const PER_SIDE = new Set([
  'db-row',
  'lunge',
  'bulgarian-split-squat',
  'step-up',
  'side-plank',
  'single-arm-cable-row',
  'cable-lateral-raise',
  'concentration-curl',
  'db-kickback',
  'reverse-lunge',
  'split-squat',
  'pistol-squat',
  'single-leg-rdl',
  'cable-kickback',
  'single-leg-glute-bridge',
  'single-leg-calf-raise',
  'bird-dog',
  'pallof-press',
  'cable-woodchop',
]);

export const BUILTIN_EXERCISES: Exercise[] = ROWS.map(([id, name, muscle, equipment, kind]) => ({
  id,
  name,
  muscle,
  equipment,
  kind,
  synergists: SYNERGISTS[id],
  ...(PER_SIDE.has(id) ? { perSide: true } : {}),
}));

const BY_ID = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]));

export function builtinExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
