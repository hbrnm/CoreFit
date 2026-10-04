import type { Equipment, Exercise, Muscle } from '../data/exercises';

/*
 * Potrivirea numelor de exerciții din alte aplicații cu catalogul CoreFit.
 * "Bench Press (Barbell)" (Hevy, Strong) și "Flat Barbell Bench Press" (FitNotes) ajung la
 * "Barbell Bench Press". Când potrivirea nu e sigură, exercițiul devine unul propriu:
 * mai bine un exercițiu în plus decât seriile puse pe exercițiul greșit.
 */

/** Cuvinte care nu deosebesc exercițiile între ele. */
const NOISE = new Set(['flat', 'the', 'with', 'and', 'bicep', 'biceps', 'exercise']);

const SQUAT_VARIANTS = ['back', 'front', 'goblet', 'split', 'bulgarian', 'bodyweight', 'air', 'hack', 'sumo', 'zercher', 'box', 'overhead', 'pistol', 'jump', 'smith'];

/** Forme lipite sau alternative, aduse la aceeași formă. */
const REWRITE: Array<[RegExp, string]> = [
  [/\bpull ?ups?\b/g, 'pull up'],
  [/\bchin ?ups?\b/g, 'chin up'],
  [/\bpush ?ups?\b/g, 'push up'],
  [/\bstep ?ups?\b/g, 'step up'],
  [/\bsit ?ups?\b/g, 'sit up'],
  [/\bskull ?crushers?\b/g, 'skull crusher'],
  [/\bpush ?downs?\b/g, 'pushdown'],
  [/\bpull ?downs?\b/g, 'pulldown'],
  [/\btriceps?\b/g, 'triceps'],
  [/\bdumbbells?\b/g, 'dumbbell'],
  [/\bdb\b/g, 'dumbbell'],
  [/\bbb\b/g, 'barbell'],
  [/\brdl\b/g, 'romanian deadlift'],
  [/\bohp\b/g, 'overhead press'],
  [/\bbent over row\b/g, 'row'],
  [/\braises\b/g, 'raise'],
  [/\bcurls\b/g, 'curl'],
  [/\brows\b/g, 'row'],
  [/\b(flyes|flys)\b/g, 'fly'],
  [/\blunges\b/g, 'lunge'],
  [/\bdips\b/g, 'dip'],
];

export function tokens(name: string): Set<string> {
  let s = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  for (const [re, to] of REWRITE) s = s.replace(re, to);
  const set = new Set(s.split(' ').filter((t) => t && !NOISE.has(t)));
  // În Hevy, Strong și FitNotes, "Squat" fără altă precizare e genuflexiunea cu bara pe spate.
  if (set.has('squat') && !SQUAT_VARIANTS.some((v) => set.has(v))) set.add('back');
  return set;
}

const plainName = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const normalizeName = (name: string): string => [...tokens(name)].sort().join(' ');

const EQUIPMENT_WORD: Record<Equipment, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  bodyweight: 'bodyweight',
  band: 'band',
  other: '',
};

function jaccard(a: Set<string>, b: Set<string>): number {
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  return common / (a.size + b.size - common || 1);
}

/** Pragul de la care o potrivire e acceptată. */
export const MATCH_THRESHOLD = 0.6;

/**
 * Exercițiul din catalog cel mai apropiat de `name`, sau null dacă nu e unul clar:
 * scorul trebuie să treacă pragul și să fie singurul cu acel scor.
 * Echipamentul din catalog contează doar când ajută ("Deadlift (Barbell)" = "Deadlift").
 */
export function matchExercise(name: string, catalog: readonly Exercise[]): Exercise | null {
  // numele afișat în română (exportul CoreFit) se potrivește exact, fără diacritice
  const plain = plainName(name);
  const exact = catalog.find((ex) => plainName(ex.name) === plain);
  if (exact) return exact;
  const want = tokens(name);
  if (want.size === 0) return null;
  let best: Exercise | null = null;
  let bestScore = 0;
  let tie = false;
  for (const ex of catalog) {
    const base = tokens(ex.en ?? ex.name);
    const withEquipment = new Set(base);
    const word = EQUIPMENT_WORD[ex.equipment];
    if (word) withEquipment.add(word);
    const score = Math.max(jaccard(want, base), jaccard(want, withEquipment));
    if (score > bestScore + 1e-9) {
      best = ex;
      bestScore = score;
      tie = false;
    } else if (Math.abs(score - bestScore) < 1e-9) tie = true;
  }
  return best && bestScore >= MATCH_THRESHOLD && !tie ? best : null;
}

/** Echipamentul dedus din nume ("Lateral Raise (Dumbbell)"), pentru exercițiile proprii noi. */
export function guessEquipment(name: string): Equipment {
  const t = tokens(name);
  for (const eq of ['barbell', 'dumbbell', 'cable', 'machine', 'band'] as const) if (t.has(eq)) return eq;
  if (t.has('smith') || t.has('ez')) return 'barbell';
  return 'other';
}

/** Grupa din FitNotes ("Chest", "Legs"...), unde se potrivește cu una din cele 10. */
export function muscleFromCategory(category: string | undefined): Muscle | null {
  const c = (category ?? '').trim().toLowerCase();
  const map: Record<string, Muscle> = {
    chest: 'chest',
    back: 'back',
    shoulders: 'shoulders',
    biceps: 'biceps',
    triceps: 'triceps',
    legs: 'quads',
    quads: 'quads',
    quadriceps: 'quads',
    hamstrings: 'hamstrings',
    glutes: 'glutes',
    calves: 'calves',
    abs: 'core',
    core: 'core',
  };
  return map[c] ?? null;
}
