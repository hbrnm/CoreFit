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
}

const exercisesList = exercisesData as ExerciseItem[];

const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  Piept: [
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/1.jpg',
  ],
  Spate: [
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/1.jpg',
  ],
  Umeri: [
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/1.jpg',
  ],
  Picioare: [
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/1.jpg',
  ],
  Brațe: [
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/1.jpg',
  ],
  Abdomen: [
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/1.jpg',
  ],
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
 * Găsește exercițiul și imaginile sale pe baza numelui sau a categoriei
 */
export function getExerciseIllustration(exerciseName: string, category?: string): { images: string[]; exercise?: ExerciseItem } {
  const norm = exerciseName.toLowerCase();

  // 1. Caută ID direct
  const exactById = exercisesList.find((ex) => ex.id === norm);
  if (exactById && exactById.images && exactById.images.length > 0) {
    return { images: exactById.images, exercise: exactById };
  }

  // 2. Caută nume exact sau parțial în lista noastră
  const exactByName = exercisesList.find((ex) => {
    const exNorm = ex.name.toLowerCase();
    return exNorm.includes(norm) || norm.includes(exNorm);
  });
  if (exactByName && exactByName.images && exactByName.images.length > 0) {
    return { images: exactByName.images, exercise: exactByName };
  }

  // 3. Caută după cuvinte cheie specifice
  for (const item of SPECIFIC_KEYWORDS_MAP) {
    const matchAll = item.keywords.every((kw) => norm.includes(kw));
    if (matchAll) {
      const ex = exercisesList.find((e) => e.id === item.exerciseId);
      if (ex && ex.images && ex.images.length > 0) {
        return { images: ex.images, exercise: ex };
      }
    }
  }

  // 4. Fallback după categorie (Piept, Spate, etc.)
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return { images: CATEGORY_FALLBACK_IMAGES[category] };
  }

  // 5. Fallback general: Bench Press
  return { images: CATEGORY_FALLBACK_IMAGES.Piept };
}
