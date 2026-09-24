/** Ilustrații RepDB, doar pentru exercițiile din catalog. Atribuirea e în Profil. */
export interface ExerciseArt {
  first: string;
  second?: string;
}

export const EXERCISE_ART_CREDIT = {
  href: 'https://repdb.co',
  label: 'Exercise data by RepDB (repdb.co)',
} as const;

export const EXERCISE_ART: Record<string, ExerciseArt> = {
  'ab-wheel': { first: '/exercises/ab-wheel-start.webp', second: '/exercises/ab-wheel-peak.webp' },
  'back-extension': { first: '/exercises/back-extension-start.webp', second: '/exercises/back-extension-peak.webp' },
  'back-squat': { first: '/exercises/back-squat-start.webp', second: '/exercises/back-squat-peak.webp' },
  'barbell-curl': { first: '/exercises/barbell-curl-start.webp', second: '/exercises/barbell-curl-peak.webp' },
  'barbell-row': { first: '/exercises/barbell-row-start.webp', second: '/exercises/barbell-row-peak.webp' },
  'bench-press': { first: '/exercises/bench-press-start.webp', second: '/exercises/bench-press-peak.webp' },
  'bodyweight-squat': { first: '/exercises/bodyweight-squat-start.webp', second: '/exercises/bodyweight-squat-peak.webp' },
  'bulgarian-split-squat': { first: '/exercises/bulgarian-split-squat-start.webp', second: '/exercises/bulgarian-split-squat-peak.webp' },
  'cable-crunch': { first: '/exercises/cable-crunch-start.webp', second: '/exercises/cable-crunch-peak.webp' },
  'cable-curl': { first: '/exercises/cable-curl-start.webp', second: '/exercises/cable-curl-peak.webp' },
  'cable-fly': { first: '/exercises/cable-fly-start.webp', second: '/exercises/cable-fly-peak.webp' },
  'chin-up': { first: '/exercises/chin-up-start.webp', second: '/exercises/chin-up-peak.webp' },
  'close-grip-bench': { first: '/exercises/close-grip-bench-start.webp', second: '/exercises/close-grip-bench-peak.webp' },
  'db-bench': { first: '/exercises/db-bench-start.webp', second: '/exercises/db-bench-peak.webp' },
  'db-curl': { first: '/exercises/db-curl-start.webp', second: '/exercises/db-curl-peak.webp' },
  'db-fly': { first: '/exercises/db-fly-start.webp', second: '/exercises/db-fly-peak.webp' },
  'db-row': { first: '/exercises/db-row-start.webp', second: '/exercises/db-row-peak.webp' },
  'db-shoulder-press': { first: '/exercises/db-shoulder-press-start.webp', second: '/exercises/db-shoulder-press-peak.webp' },
  'dead-bug': { first: '/exercises/dead-bug-start.webp', second: '/exercises/dead-bug-peak.webp' },
  'deadlift': { first: '/exercises/deadlift-start.webp', second: '/exercises/deadlift-peak.webp' },
  'dips': { first: '/exercises/dips-start.webp', second: '/exercises/dips-peak.webp' },
  'face-pull': { first: '/exercises/face-pull-start.webp', second: '/exercises/face-pull-peak.webp' },
  'front-squat': { first: '/exercises/front-squat-start.webp', second: '/exercises/front-squat-peak.webp' },
  'glute-bridge': { first: '/exercises/glute-bridge-start.webp', second: '/exercises/glute-bridge-peak.webp' },
  'goblet-squat': { first: '/exercises/goblet-squat-start.webp', second: '/exercises/goblet-squat-peak.webp' },
  'hammer-curl': { first: '/exercises/hammer-curl-start.webp', second: '/exercises/hammer-curl-peak.webp' },
  'hanging-leg-raise': { first: '/exercises/hanging-leg-raise-start.webp', second: '/exercises/hanging-leg-raise-peak.webp' },
  'hip-abduction': { first: '/exercises/hip-abduction-start.webp', second: '/exercises/hip-abduction-peak.webp' },
  'hip-thrust': { first: '/exercises/hip-thrust-start.webp', second: '/exercises/hip-thrust-peak.webp' },
  'incline-bench': { first: '/exercises/incline-bench-start.webp', second: '/exercises/incline-bench-peak.webp' },
  'incline-db-press': { first: '/exercises/incline-db-press-start.webp', second: '/exercises/incline-db-press-peak.webp' },
  'inverted-row': { first: '/exercises/inverted-row-start.webp', second: '/exercises/inverted-row-peak.webp' },
  'lat-pulldown': { first: '/exercises/lat-pulldown-start.webp', second: '/exercises/lat-pulldown-peak.webp' },
  'lateral-raise': { first: '/exercises/lateral-raise-start.webp', second: '/exercises/lateral-raise-peak.webp' },
  'leg-curl': { first: '/exercises/leg-curl-start.webp', second: '/exercises/leg-curl-peak.webp' },
  'leg-extension': { first: '/exercises/leg-extension-start.webp', second: '/exercises/leg-extension-peak.webp' },
  'leg-press': { first: '/exercises/leg-press-start.webp', second: '/exercises/leg-press-peak.webp' },
  'lunge': { first: '/exercises/lunge-start.webp', second: '/exercises/lunge-peak.webp' },
  'machine-chest-press': { first: '/exercises/machine-chest-press-start.webp', second: '/exercises/machine-chest-press-peak.webp' },
  'overhead-press': { first: '/exercises/overhead-press-start.webp', second: '/exercises/overhead-press-peak.webp' },
  'overhead-triceps': { first: '/exercises/overhead-triceps-start.webp', second: '/exercises/overhead-triceps-peak.webp' },
  'plank': { first: '/exercises/plank-main.webp' },
  'pull-up': { first: '/exercises/pull-up-start.webp', second: '/exercises/pull-up-peak.webp' },
  'push-up': { first: '/exercises/push-up-start.webp', second: '/exercises/push-up-peak.webp' },
  'rear-delt-fly': { first: '/exercises/rear-delt-fly-start.webp', second: '/exercises/rear-delt-fly-peak.webp' },
  'romanian-deadlift': { first: '/exercises/romanian-deadlift-start.webp', second: '/exercises/romanian-deadlift-peak.webp' },
  'seated-cable-row': { first: '/exercises/seated-cable-row-start.webp', second: '/exercises/seated-cable-row-peak.webp' },
  'seated-calf-raise': { first: '/exercises/seated-calf-raise-start.webp', second: '/exercises/seated-calf-raise-peak.webp' },
  'seated-leg-curl': { first: '/exercises/seated-leg-curl-start.webp', second: '/exercises/seated-leg-curl-peak.webp' },
  'shrug': { first: '/exercises/shrug-start.webp', second: '/exercises/shrug-peak.webp' },
  'side-plank': { first: '/exercises/side-plank-main.webp' },
  'skull-crusher': { first: '/exercises/skull-crusher-start.webp', second: '/exercises/skull-crusher-peak.webp' },
  'standing-calf-raise': { first: '/exercises/standing-calf-raise-start.webp', second: '/exercises/standing-calf-raise-peak.webp' },
  'step-up': { first: '/exercises/step-up-start.webp', second: '/exercises/step-up-peak.webp' },
  'triceps-pushdown': { first: '/exercises/triceps-pushdown-start.webp', second: '/exercises/triceps-pushdown-peak.webp' },
};

export function exerciseArt(id: string): ExerciseArt | null {
  return EXERCISE_ART[id] ?? null;
}
