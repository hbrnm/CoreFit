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
  /** numele afișat, în română */
  name: string;
  /** numele în engleză (cum apare în Strong, Hevy, FitNotes): pentru import și căutare */
  en?: string;
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

type Row = [id: string, name: string, en: string, muscle: Muscle, equipment: Equipment, kind: ExerciseKind];

const ROWS: Row[] = [
  // piept
  ['bench-press', 'Împins cu bara la piept', 'Barbell Bench Press', 'chest', 'barbell', 'reps'],
  ['incline-bench', 'Împins înclinat cu bara', 'Incline Barbell Bench Press', 'chest', 'barbell', 'reps'],
  ['db-bench', 'Împins cu gantere la piept', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'reps'],
  ['incline-db-press', 'Împins înclinat cu gantere', 'Incline Dumbbell Press', 'chest', 'dumbbell', 'reps'],
  ['machine-chest-press', 'Împins la piept la aparat', 'Machine Chest Press', 'chest', 'machine', 'reps'],
  ['db-fly', 'Fluturări cu gantere', 'Dumbbell Fly', 'chest', 'dumbbell', 'reps'],
  ['cable-fly', 'Fluturări la cablu', 'Cable Fly', 'chest', 'cable', 'reps'],
  ['push-up', 'Flotări', 'Push-up', 'chest', 'bodyweight', 'bodyweight'],
  ['dips', 'Flotări la paralele', 'Dips', 'chest', 'bodyweight', 'bodyweight'],
  // spate
  ['deadlift', 'Îndreptări', 'Deadlift', 'back', 'barbell', 'reps'],
  ['pull-up', 'Tracțiuni', 'Pull-up', 'back', 'bodyweight', 'bodyweight'],
  ['chin-up', 'Tracțiuni cu priză supinată', 'Chin-up', 'back', 'bodyweight', 'bodyweight'],
  ['lat-pulldown', 'Tras la helcometru', 'Lat Pulldown', 'back', 'cable', 'reps'],
  ['barbell-row', 'Ramat cu bara', 'Barbell Row', 'back', 'barbell', 'reps'],
  ['db-row', 'Ramat cu o ganteră', 'One-arm Dumbbell Row', 'back', 'dumbbell', 'reps'],
  ['seated-cable-row', 'Ramat la cablu, șezând', 'Seated Cable Row', 'back', 'cable', 'reps'],
  ['inverted-row', 'Ramat inversat', 'Inverted Row', 'back', 'bodyweight', 'bodyweight'],
  ['back-extension', 'Hiperextensii', 'Back Extension', 'back', 'bodyweight', 'bodyweight'],
  // umeri
  ['overhead-press', 'Împins deasupra capului cu bara', 'Overhead Press', 'shoulders', 'barbell', 'reps'],
  ['db-shoulder-press', 'Împins cu gantere pentru umeri', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'reps'],
  ['lateral-raise', 'Ridicări laterale', 'Lateral Raise', 'shoulders', 'dumbbell', 'reps'],
  ['rear-delt-fly', 'Fluturări pentru deltoidul posterior', 'Rear Delt Fly', 'shoulders', 'dumbbell', 'reps'],
  ['face-pull', 'Face pull la cablu', 'Face Pull', 'shoulders', 'cable', 'reps'],
  ['shrug', 'Ridicări de umeri cu bara', 'Barbell Shrug', 'shoulders', 'barbell', 'reps'],
  // biceps
  ['barbell-curl', 'Flexii cu bara', 'Barbell Curl', 'biceps', 'barbell', 'reps'],
  ['db-curl', 'Flexii cu gantere', 'Dumbbell Curl', 'biceps', 'dumbbell', 'reps'],
  ['hammer-curl', 'Flexii ciocan', 'Hammer Curl', 'biceps', 'dumbbell', 'reps'],
  ['cable-curl', 'Flexii la cablu', 'Cable Curl', 'biceps', 'cable', 'reps'],
  // triceps
  ['triceps-pushdown', 'Extensii triceps la cablu', 'Triceps Pushdown', 'triceps', 'cable', 'reps'],
  ['skull-crusher', 'Extensii triceps cu bara, culcat', 'Skull Crusher', 'triceps', 'barbell', 'reps'],
  ['overhead-triceps', 'Extensii triceps deasupra capului', 'Overhead Triceps Extension', 'triceps', 'dumbbell', 'reps'],
  ['close-grip-bench', 'Împins cu priză îngustă', 'Close-grip Bench Press', 'triceps', 'barbell', 'reps'],
  // cvadricepși
  ['back-squat', 'Genuflexiuni cu bara', 'Barbell Back Squat', 'quads', 'barbell', 'reps'],
  ['front-squat', 'Genuflexiuni cu bara în față', 'Front Squat', 'quads', 'barbell', 'reps'],
  ['goblet-squat', 'Genuflexiuni goblet', 'Goblet Squat', 'quads', 'dumbbell', 'reps'],
  ['bodyweight-squat', 'Genuflexiuni fără greutate', 'Bodyweight Squat', 'quads', 'bodyweight', 'bodyweight'],
  ['leg-press', 'Presă pentru picioare', 'Leg Press', 'quads', 'machine', 'reps'],
  ['leg-extension', 'Extensii pentru cvadricepși', 'Leg Extension', 'quads', 'machine', 'reps'],
  ['lunge', 'Fandări din mers', 'Walking Lunge', 'quads', 'dumbbell', 'reps'],
  ['bulgarian-split-squat', 'Genuflexiuni bulgărești', 'Bulgarian Split Squat', 'quads', 'dumbbell', 'reps'],
  ['step-up', 'Urcări pe bancă', 'Step-up', 'quads', 'dumbbell', 'reps'],
  // femurali
  ['romanian-deadlift', 'Îndreptări românești', 'Romanian Deadlift', 'hamstrings', 'barbell', 'reps'],
  ['leg-curl', 'Flexii pentru femurali, culcat', 'Lying Leg Curl', 'hamstrings', 'machine', 'reps'],
  ['seated-leg-curl', 'Flexii pentru femurali, șezând', 'Seated Leg Curl', 'hamstrings', 'machine', 'reps'],
  // fesieri
  ['hip-thrust', 'Hip thrust cu bara', 'Barbell Hip Thrust', 'glutes', 'barbell', 'reps'],
  ['glute-bridge', 'Pod pentru fesieri', 'Glute Bridge', 'glutes', 'bodyweight', 'bodyweight'],
  ['hip-abduction', 'Abducții la aparat', 'Hip Abduction Machine', 'glutes', 'machine', 'reps'],
  // gambe
  ['standing-calf-raise', 'Ridicări pe vârfuri, în picioare', 'Standing Calf Raise', 'calves', 'machine', 'reps'],
  ['seated-calf-raise', 'Ridicări pe vârfuri, șezând', 'Seated Calf Raise', 'calves', 'machine', 'reps'],
  // abdomen
  ['plank', 'Planșă', 'Plank', 'core', 'bodyweight', 'duration'],
  ['side-plank', 'Planșă laterală', 'Side Plank', 'core', 'bodyweight', 'duration'],
  ['dead-bug', 'Dead bug', 'Dead Bug', 'core', 'bodyweight', 'bodyweight'],
  ['hanging-leg-raise', 'Ridicări de picioare din atârnat', 'Hanging Leg Raise', 'core', 'bodyweight', 'bodyweight'],
  ['cable-crunch', 'Abdomene la cablu', 'Cable Crunch', 'core', 'cable', 'reps'],
  ['ab-wheel', 'Rotiță pentru abdomen', 'Ab Wheel Rollout', 'core', 'other', 'bodyweight'],

  // ------------------------------------------------------------- extinderea catalogului (fără ilustrații)
  // piept
  ['decline-bench', 'Împins declinat cu bara', 'Decline Barbell Bench Press', 'chest', 'barbell', 'reps'],
  ['smith-bench', 'Împins la piept la Smith', 'Smith Machine Bench Press', 'chest', 'machine', 'reps'],
  ['incline-db-fly', 'Fluturări înclinate cu gantere', 'Incline Dumbbell Fly', 'chest', 'dumbbell', 'reps'],
  ['pec-deck', 'Fluturări la aparat (pec deck)', 'Pec Deck', 'chest', 'machine', 'reps'],
  ['db-pullover', 'Pullover cu ganteră', 'Dumbbell Pullover', 'chest', 'dumbbell', 'reps'],
  ['incline-push-up', 'Flotări înclinate', 'Incline Push-up', 'chest', 'bodyweight', 'bodyweight'],
  // spate
  ['rack-pull', 'Îndreptări de pe suport', 'Rack Pull', 'back', 'barbell', 'reps'],
  ['pendlay-row', 'Ramat Pendlay', 'Pendlay Row', 'back', 'barbell', 'reps'],
  ['t-bar-row', 'Ramat la T-bar', 'T-Bar Row', 'back', 'barbell', 'reps'],
  ['chest-supported-row', 'Ramat cu gantere, cu pieptul sprijinit', 'Chest-supported Dumbbell Row', 'back', 'dumbbell', 'reps'],
  ['machine-row', 'Ramat la aparat', 'Machine Row', 'back', 'machine', 'reps'],
  ['single-arm-cable-row', 'Ramat la cablu cu o mână', 'Single-arm Cable Row', 'back', 'cable', 'reps'],
  ['straight-arm-pulldown', 'Tras cu brațele întinse la cablu', 'Straight-arm Pulldown', 'back', 'cable', 'reps'],
  ['assisted-pull-up', 'Tracțiuni asistate la aparat', 'Assisted Pull-up Machine', 'back', 'machine', 'reps'],
  ['superman', 'Superman', 'Superman', 'back', 'bodyweight', 'bodyweight'],
  // umeri
  ['arnold-press', 'Împins Arnold', 'Arnold Press', 'shoulders', 'dumbbell', 'reps'],
  ['machine-shoulder-press', 'Împins pentru umeri la aparat', 'Machine Shoulder Press', 'shoulders', 'machine', 'reps'],
  ['landmine-press', 'Împins landmine', 'Landmine Press', 'shoulders', 'barbell', 'reps'],
  ['cable-lateral-raise', 'Ridicări laterale la cablu', 'Cable Lateral Raise', 'shoulders', 'cable', 'reps'],
  ['front-raise', 'Ridicări frontale cu gantere', 'Dumbbell Front Raise', 'shoulders', 'dumbbell', 'reps'],
  ['upright-row', 'Ramat vertical', 'Upright Row', 'shoulders', 'barbell', 'reps'],
  ['reverse-pec-deck', 'Fluturări inverse la aparat', 'Reverse Pec Deck', 'shoulders', 'machine', 'reps'],
  ['band-pull-apart', 'Depărtări cu bandă elastică', 'Band Pull-apart', 'shoulders', 'band', 'reps'],
  ['pike-push-up', 'Flotări pike', 'Pike Push-up', 'shoulders', 'bodyweight', 'bodyweight'],
  ['db-shrug', 'Ridicări de umeri cu gantere', 'Dumbbell Shrug', 'shoulders', 'dumbbell', 'reps'],
  // biceps
  ['ez-bar-curl', 'Flexii cu bara EZ', 'EZ-bar Curl', 'biceps', 'barbell', 'reps'],
  ['preacher-curl', 'Flexii la pupitru', 'Preacher Curl', 'biceps', 'barbell', 'reps'],
  ['incline-db-curl', 'Flexii cu gantere pe bancă înclinată', 'Incline Dumbbell Curl', 'biceps', 'dumbbell', 'reps'],
  ['concentration-curl', 'Flexii concentrate', 'Concentration Curl', 'biceps', 'dumbbell', 'reps'],
  ['band-curl', 'Flexii cu bandă elastică', 'Band Curl', 'biceps', 'band', 'reps'],
  // triceps
  ['rope-pushdown', 'Extensii triceps la cablu cu frânghie', 'Rope Triceps Pushdown', 'triceps', 'cable', 'reps'],
  ['overhead-cable-extension', 'Extensii triceps la cablu, deasupra capului', 'Overhead Cable Triceps Extension', 'triceps', 'cable', 'reps'],
  ['db-kickback', 'Kickback triceps cu ganteră', 'Dumbbell Triceps Kickback', 'triceps', 'dumbbell', 'reps'],
  ['bench-dip', 'Flotări la bancă', 'Bench Dip', 'triceps', 'bodyweight', 'bodyweight'],
  ['diamond-push-up', 'Flotări diamant', 'Diamond Push-up', 'triceps', 'bodyweight', 'bodyweight'],
  // cvadricepși
  ['hack-squat', 'Hack squat', 'Hack Squat', 'quads', 'machine', 'reps'],
  ['smith-squat', 'Genuflexiuni la Smith', 'Smith Machine Squat', 'quads', 'machine', 'reps'],
  ['reverse-lunge', 'Fandări înapoi cu gantere', 'Dumbbell Reverse Lunge', 'quads', 'dumbbell', 'reps'],
  ['split-squat', 'Genuflexiuni fandate cu gantere', 'Dumbbell Split Squat', 'quads', 'dumbbell', 'reps'],
  ['pistol-squat', 'Genuflexiuni pe un picior (pistol)', 'Pistol Squat', 'quads', 'bodyweight', 'bodyweight'],
  ['wall-sit', 'Scaunul la perete', 'Wall Sit', 'quads', 'bodyweight', 'duration'],
  // femurali
  ['stiff-leg-deadlift', 'Îndreptări cu picioarele întinse', 'Stiff-leg Deadlift', 'hamstrings', 'barbell', 'reps'],
  ['db-rdl', 'Îndreptări românești cu gantere', 'Dumbbell Romanian Deadlift', 'hamstrings', 'dumbbell', 'reps'],
  ['single-leg-rdl', 'Îndreptări românești pe un picior', 'Single-leg Romanian Deadlift', 'hamstrings', 'dumbbell', 'reps'],
  ['good-morning', 'Good morning', 'Good Morning', 'hamstrings', 'barbell', 'reps'],
  ['nordic-curl', 'Flexii nordice', 'Nordic Hamstring Curl', 'hamstrings', 'bodyweight', 'bodyweight'],
  ['glute-ham-raise', 'Glute-ham raise', 'Glute-Ham Raise', 'hamstrings', 'bodyweight', 'bodyweight'],
  // fesieri
  ['sumo-deadlift', 'Îndreptări sumo', 'Sumo Deadlift', 'glutes', 'barbell', 'reps'],
  ['kettlebell-swing', 'Balans cu kettlebell', 'Kettlebell Swing', 'glutes', 'other', 'reps'],
  ['hip-thrust-machine', 'Hip thrust la aparat', 'Hip Thrust Machine', 'glutes', 'machine', 'reps'],
  ['cable-kickback', 'Kickback pentru fesieri la cablu', 'Cable Glute Kickback', 'glutes', 'cable', 'reps'],
  ['single-leg-glute-bridge', 'Pod pentru fesieri pe un picior', 'Single-leg Glute Bridge', 'glutes', 'bodyweight', 'bodyweight'],
  // gambe
  ['single-leg-calf-raise', 'Ridicări pe vârfuri pe un picior', 'Single-leg Calf Raise', 'calves', 'bodyweight', 'bodyweight'],
  ['leg-press-calf-raise', 'Ridicări pe vârfuri la presă', 'Leg Press Calf Raise', 'calves', 'machine', 'reps'],
  // abdomen
  ['crunch', 'Abdomene scurte', 'Crunch', 'core', 'bodyweight', 'bodyweight'],
  ['reverse-crunch', 'Abdomene inverse', 'Reverse Crunch', 'core', 'bodyweight', 'bodyweight'],
  ['sit-up', 'Abdomene complete', 'Sit-up', 'core', 'bodyweight', 'bodyweight'],
  ['russian-twist', 'Răsuciri rusești', 'Russian Twist', 'core', 'bodyweight', 'bodyweight'],
  ['hollow-hold', 'Hollow hold', 'Hollow Body Hold', 'core', 'bodyweight', 'duration'],
  ['l-sit', 'L-sit', 'L-sit', 'core', 'bodyweight', 'duration'],
  ['bird-dog', 'Bird dog', 'Bird Dog', 'core', 'bodyweight', 'bodyweight'],
  ['pallof-press', 'Pallof press', 'Pallof Press', 'core', 'cable', 'reps'],
  ['cable-woodchop', 'Tăietorul de lemne la cablu', 'Cable Woodchop', 'core', 'cable', 'reps'],
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

export const BUILTIN_EXERCISES: Exercise[] = ROWS.map(([id, name, en, muscle, equipment, kind]) => ({
  id,
  name,
  en,
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
