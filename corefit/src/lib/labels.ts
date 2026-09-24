import type { NutritionPhase, TrainingSplit } from './db';

export const SPLIT_LABELS: Record<TrainingSplit, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / Lower',
  body_part: 'Pe grupe musculare',
  bbls_5day: 'BBLS, 5 zile',
};

export const PHASE_LABELS: Record<NutritionPhase, string> = {
  cutting: 'Definire',
  bulking: 'Masă musculară',
  maintenance: 'Menținere',
  sugar_free_reset: 'Reset fără zahăr',
};
