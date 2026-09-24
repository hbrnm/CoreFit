import exercisesData from '../data/exercises.json';

export interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primary: string;
  secondary: string[];
  notes: string;
  images: string[];
  gif_url?: string;
  localSource?: any;
}

const exercisesList = exercisesData as ExerciseItem[];

// Animații locale optimizate, cu ritm fluid (fără freeze-ul de 1 secundă)
export const LOCAL_EXERCISE_GIFS: Record<string, any> = {
  bench_press: require('../../assets/exercises/bench_press.gif'),
  incline_bench_press: require('../../assets/exercises/incline_bench_press.gif'),
  db_incline_press: require('../../assets/exercises/db_incline_press.gif'),
  cable_flyes: require('../../assets/exercises/cable_flyes.gif'),
  dips_chest: require('../../assets/exercises/dips_chest.gif'),
  deadlift: require('../../assets/exercises/deadlift.gif'),
  barbell_row: require('../../assets/exercises/barbell_row.gif'),
  lat_pulldown: require('../../assets/exercises/lat_pulldown.gif'),
  pull_ups: require('../../assets/exercises/pull_ups.gif'),
  chest_supported_row: require('../../assets/exercises/chest_supported_row.gif'),
  overhead_press: require('../../assets/exercises/overhead_press.gif'),
  cable_lateral_raise: require('../../assets/exercises/cable_lateral_raise.gif'),
  db_lateral_raise: require('../../assets/exercises/db_lateral_raise.gif'),
  face_pull: require('../../assets/exercises/face_pull.gif'),
  squat: require('../../assets/exercises/squat.gif'),
  hack_squat: require('../../assets/exercises/hack_squat.gif'),
  leg_press: require('../../assets/exercises/leg_press.gif'),
  rdl: require('../../assets/exercises/rdl.gif'),
  leg_extension: require('../../assets/exercises/leg_extension.gif'),
  seated_leg_curl: require('../../assets/exercises/seated_leg_curl.gif'),
  standing_calf_raise: require('../../assets/exercises/standing_calf_raise.gif'),
  incline_db_curl: require('../../assets/exercises/incline_db_curl.gif'),
  barbell_curl: require('../../assets/exercises/barbell_curl.gif'),
  hammer_curl: require('../../assets/exercises/hammer_curl.gif'),
  triceps_pushdown: require('../../assets/exercises/triceps_pushdown.gif'),
  overhead_triceps_ext: require('../../assets/exercises/overhead_triceps_ext.gif'),
  skull_crushers: require('../../assets/exercises/skull_crushers.gif'),
  hanging_leg_raise: require('../../assets/exercises/hanging_leg_raise.gif'),
  cable_crunch: require('../../assets/exercises/cable_crunch.gif'),
  plank: require('../../assets/exercises/plank.gif'),
};

const CATEGORY_FALLBACK_KEYS: Record<string, string> = {
  Piept: 'bench_press',
  Spate: 'lat_pulldown',
  Umeri: 'overhead_press',
  Picioare: 'squat',
  Brațe: 'barbell_curl',
  Abdomen: 'hanging_leg_raise',
};

const SPECIFIC_KEYWORDS_MAP: { keywords: string[]; exerciseId: string }[] = [
  { keywords: ['înclinat', 'halter'], exerciseId: 'incline_bench_press' },
  { keywords: ['înclinat', 'ganter'], exerciseId: 'db_incline_press' },
  { keywords: ['bench', 'orizontal', 'piept'], exerciseId: 'bench_press' },
  { keywords: ['fluturări', 'cabluri'], exerciseId: 'cable_flyes' },
  { keywords: ['dips', 'paralele'], exerciseId: 'dips_chest' },
  { keywords: ['tracțiuni', 'pulldown', 'scripete'], exerciseId: 'lat_pulldown' },
  { keywords: ['pull-up', 'tracțiuni la bară'], exerciseId: 'pull_ups' },
  { keywords: ['ramat', 'halter'], exerciseId: 'barbell_row' },
  { keywords: ['ramat', 'suport', 'piept'], exerciseId: 'chest_supported_row' },
  { keywords: ['face pull'], exerciseId: 'face_pull' },
  { keywords: ['ridicări laterale', 'cablu'], exerciseId: 'cable_lateral_raise' },
  { keywords: ['ridicări laterale', 'ganter'], exerciseId: 'db_lateral_raise' },
  { keywords: ['overhead', 'militar', 'deasupra'], exerciseId: 'overhead_press' },
  { keywords: ['hack squat'], exerciseId: 'hack_squat' },
  { keywords: ['genuflexiuni', 'squat'], exerciseId: 'squat' },
  { keywords: ['leg press', 'presă'], exerciseId: 'leg_press' },
  { keywords: ['rdl', 'românești', 'îndreptări românești'], exerciseId: 'rdl' },
  { keywords: ['îndreptări', 'deadlift'], exerciseId: 'deadlift' },
  { keywords: ['extensii picioare'], exerciseId: 'leg_extension' },
  { keywords: ['flexii picioare'], exerciseId: 'seated_leg_curl' },
  { keywords: ['vârfuri', 'gambe', 'calf'], exerciseId: 'standing_calf_raise' },
  { keywords: ['ciocan', 'hammer'], exerciseId: 'hammer_curl' },
  { keywords: ['biceps', 'înclinat'], exerciseId: 'incline_db_curl' },
  { keywords: ['biceps', 'bară', 'ez'], exerciseId: 'barbell_curl' },
  { keywords: ['triceps', 'scripete', 'pushdown'], exerciseId: 'triceps_pushdown' },
  { keywords: ['overhead triceps', 'triceps deasupra'], exerciseId: 'overhead_triceps_ext' },
  { keywords: ['skull', 'crushers'], exerciseId: 'skull_crushers' },
  { keywords: ['hanging', 'ridicări de picioare'], exerciseId: 'hanging_leg_raise' },
  { keywords: ['cable crunch', 'abdomene la cablu'], exerciseId: 'cable_crunch' },
  { keywords: ['plank', 'scândură'], exerciseId: 'plank' },
];

/**
 * Găsește exercițiul și sursa locală a animației GIF 3D fluide
 */
export function getExerciseIllustration(exerciseName: string, category?: string): {
  source: any;
  images: string[];
  gifUrl: string;
  exercise?: ExerciseItem;
} {
  const norm = exerciseName.toLowerCase();

  // 1. Caută ID direct
  if (LOCAL_EXERCISE_GIFS[norm]) {
    const ex = exercisesList.find((e) => e.id === norm);
    return {
      source: LOCAL_EXERCISE_GIFS[norm],
      images: ex?.images || [],
      gifUrl: ex?.gif_url || '',
      exercise: ex,
    };
  }

  // 2. Caută nume exact sau parțial în lista noastră
  const exactByName = exercisesList.find((ex) => {
    const exNorm = ex.name.toLowerCase();
    return exNorm.includes(norm) || norm.includes(exNorm);
  });
  if (exactByName && LOCAL_EXERCISE_GIFS[exactByName.id]) {
    return {
      source: LOCAL_EXERCISE_GIFS[exactByName.id],
      images: exactByName.images || [],
      gifUrl: exactByName.gif_url || '',
      exercise: exactByName,
    };
  }

  // 3. Caută după cuvinte cheie specifice
  for (const item of SPECIFIC_KEYWORDS_MAP) {
    const matchAll = item.keywords.every((kw) => norm.includes(kw));
    if (matchAll && LOCAL_EXERCISE_GIFS[item.exerciseId]) {
      const ex = exercisesList.find((e) => e.id === item.exerciseId);
      return {
        source: LOCAL_EXERCISE_GIFS[item.exerciseId],
        images: ex?.images || [],
        gifUrl: ex?.gif_url || '',
        exercise: ex,
      };
    }
  }

  // 4. Fallback după categorie
  const fallbackKey = (category && CATEGORY_FALLBACK_KEYS[category]) || 'bench_press';
  const fallbackEx = exercisesList.find((e) => e.id === fallbackKey);
  return {
    source: LOCAL_EXERCISE_GIFS[fallbackKey],
    images: fallbackEx?.images || [],
    gifUrl: fallbackEx?.gif_url || '',
    exercise: fallbackEx,
  };
}
