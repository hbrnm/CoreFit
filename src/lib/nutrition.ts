import type {
  ActivityLevel,
  LocalFoodEntry,
  LocalNutritionLog,
  LocalProfile,
  LocalRecipe,
  Meal,
  MealPlan,
  NutritionPhase,
  Per100,
  RecipeIngredient,
  Sex,
} from './db';
import { addDays } from './date';

export interface Totals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  /** miligrame */
  sodium: number;
}

export const ZERO_TOTALS: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

/** Plafon de sodiu (CDRR), nu o țintă de atins. */
export const SODIUM_LIMIT_MG = 2300;

export function sumEntries(entries: Array<Pick<LocalFoodEntry, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar'> & { sodium?: number }>): Totals {
  return entries.reduce<Totals>(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + e.fiber,
      sugar: acc.sugar + e.sugar,
      sodium: acc.sodium + (e.sodium ?? 0),
    }),
    ZERO_TOTALS,
  );
}

export function fromPer100(p: Per100, grams: number): Totals {
  const k = grams / 100;
  return {
    kcal: p.kcal100 * k,
    protein: p.protein100 * k,
    carbs: p.carbs100 * k,
    fat: p.fat100 * k,
    fiber: p.fiber100 * k,
    sugar: p.sugar100 * k,
    sodium: (p.sodium100 ?? 0) * k,
  };
}

export function per100Of(recipe: Pick<LocalRecipe, 'ingredients' | 'cooked_weight_g'>): Per100 | null {
  const total = recipeTotals(recipe.ingredients);
  const weight = recipe.cooked_weight_g ?? recipe.ingredients.reduce((s, i) => s + i.grams, 0);
  if (weight <= 0) return null;
  const k = 100 / weight;
  return {
    kcal100: total.kcal * k,
    protein100: total.protein * k,
    carbs100: total.carbs * k,
    fat100: total.fat * k,
    fiber100: total.fiber * k,
    sugar100: total.sugar * k,
    sodium100: total.sodium * k,
  };
}

export function recipeTotals(ingredients: RecipeIngredient[]): Totals {
  return ingredients.reduce<Totals>((acc, i) => {
    const t = fromPer100(i, i.grams);
    return {
      kcal: acc.kcal + t.kcal,
      protein: acc.protein + t.protein,
      carbs: acc.carbs + t.carbs,
      fat: acc.fat + t.fat,
      fiber: acc.fiber + t.fiber,
      sugar: acc.sugar + t.sugar,
      sodium: acc.sodium + t.sodium,
    };
  }, ZERO_TOTALS);
}

export function perServing(totals: Totals, servings: number): Totals {
  const s = servings > 0 ? servings : 1;
  return {
    kcal: totals.kcal / s,
    protein: totals.protein / s,
    carbs: totals.carbs / s,
    fat: totals.fat / s,
    fiber: totals.fiber / s,
    sugar: totals.sugar / s,
    sodium: totals.sodium / s,
  };
}

// ------------------------------------------------------------------ ținte

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentar (birou, fără sport)',
  light: 'Ușor activ (1-3 antrenamente pe săptămână)',
  moderate: 'Moderat activ (3-5 antrenamente)',
  active: 'Foarte activ (6-7 antrenamente)',
  very_active: 'Extrem de activ (muncă fizică grea plus sport)',
};

/** Ajustarea caloriilor față de întreținere, pe faze. Valori orientative. */
export const PHASE_ADJUSTMENT: Record<NutritionPhase, number> = {
  cutting: -0.2,
  maintenance: 0,
  bulking: 0.1,
  sugar_free_reset: 0,
};

/** Proteină: platoul câștigului muscular este în jur de 1,6 g/kg/zi (Morton 2018). */
export const PROTEIN_G_PER_KG = 1.8;
/** Grăsimi: ca procent din calorii; carbohidrații umplu restul. */
export const FAT_KCAL_SHARE = 0.25;

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** kcal/zi în repaus, Mifflin-St Jeor, rotunjit */
  bmrKcal: number | null;
  maintenanceKcal: number | null;
  manual: boolean;
}

/** Metabolism bazal, formula Mifflin-St Jeor. */
export function bmr(sex: 'male' | 'female', weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function computeTargets(
  profile: LocalProfile | undefined,
  weightKg: number | null,
  year: number,
): Targets | null {
  if (!profile) return null;
  // Fallback to null if weight is unrealistic or missing, preventing bad macro outputs
  if (!weightKg || weightKg < 20 || weightKg > 400) return null;

  let maintenance: number | null = null;
  let bmrKcal: number | null = null;
  
  if (profile.sex && profile.height_cm && profile.height_cm >= 50 && profile.height_cm <= 260 && profile.birth_year) {
    const age = year - profile.birth_year;
    if (age >= 10 && age <= 120) {
      const resting = bmr(profile.sex, weightKg, profile.height_cm, age);
      bmrKcal = Math.round(resting);
      maintenance = resting * ACTIVITY_FACTORS[profile.activity_level];
    }
  }

  let kcal: number;
  let manual = false;
  if (profile.kcal_target_override) {
    kcal = profile.kcal_target_override;
    manual = true;
  } else if (maintenance) {
    kcal = Math.round((maintenance * (1 + PHASE_ADJUSTMENT[profile.nutrition_phase])) / 10) * 10;
  } else {
    return null;
  }

  const proteinRaw = Math.round(weightKg * PROTEIN_G_PER_KG);
  const fatRaw = Math.round((kcal * FAT_KCAL_SHARE) / 9);

  let protein = proteinRaw;
  let fat = fatRaw;
  let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  // Normalization if target calories are extremely low compared to the bodyweight protein requirement
  if (carbs < 0) {
    const macroKcal = proteinRaw * 4 + fatRaw * 9;
    const ratio = kcal / macroKcal;
    protein = Math.floor(proteinRaw * ratio);
    fat = Math.floor(fatRaw * ratio);
    carbs = 0;
  }

  return { kcal, protein, carbs, fat, bmrKcal, maintenanceKcal: maintenance ? Math.round(maintenance) : null, manual };
}

// ------------------------------------------------------------------ mese, fibre, apă
// Numerele de mai jos urmează referințele publice folosite și de OpenNutriTracker
// (IOM pentru fibre, OMS pentru zaharuri libere, EFSA pentru apa de băut,
// împărțirea practică 30/40/20/10 și variantele ei). Nu sunt o prescripție medicală.

export const MEAL_PLAN_ORDER: readonly MealPlan[] = [
  'standard',
  'mediterranean',
  'two_meal',
  'omad',
  'five_small',
];

export const MEAL_PLANS: Record<
  MealPlan,
  { label: string; hint: string; shares: Record<Meal, number> }
> = {
  standard: {
    label: 'Standard',
    hint: 'Mic dejun 30%, prânz 40%, cină 20%, gustări 10%.',
    shares: { breakfast: 30, lunch: 40, dinner: 20, snack: 10 },
  },
  mediterranean: {
    label: 'Mediteraneană',
    hint: 'Prânzul e masa mare: 25% / 45% / 20% / 10%.',
    shares: { breakfast: 25, lunch: 45, dinner: 20, snack: 10 },
  },
  two_meal: {
    label: 'Două mese',
    hint: 'Mic dejun 40%, cină 50%, gustări 10%. Prânzul nu e în plan.',
    shares: { breakfast: 40, lunch: 0, dinner: 50, snack: 10 },
  },
  omad: {
    label: 'O masă',
    hint: 'Toate caloriile la cină. Poți muta alimentele dacă mănânci mai devreme.',
    shares: { breakfast: 0, lunch: 0, dinner: 100, snack: 0 },
  },
  five_small: {
    label: 'Gustări dese',
    hint: 'Porții mici: 20% / 25% / 25%, iar gustările 30%.',
    shares: { breakfast: 20, lunch: 25, dinner: 25, snack: 30 },
  },
};

export function mealKcalTarget(dailyKcal: number, plan: MealPlan, meal: Meal): number {
  return Math.round((dailyKcal * MEAL_PLANS[plan].shares[meal]) / 100);
}

/**
 * Aport adecvat de fibre (IOM): bărbați 38 g până la 50 de ani, apoi 30 g;
 * femei 25 g până la 50, apoi 21 g. null dacă nu știm sexul sau vârsta de adult.
 */
export function fiberAdequateIntake(sex: Sex | null, age: number | null): number | null {
  if (!sex || age === null || age < 19) return null;
  if (sex === 'male') return age <= 50 ? 38 : 30;
  return age <= 50 ? 25 : 21;
}

/** OMS: zaharurile libere sub 10% din energie. 4 kcal/g. Plafon, nu țintă. */
export function freeSugarCeilingGrams(kcal: number): number {
  return Math.round((kcal * 0.1) / 4);
}

/** Apă de băut, EFSA 2010 minus ~20% care vine din mâncare. Fără sex: media. */
export function waterGoalMl(sex: Sex | null): number {
  if (sex === 'male') return 1900;
  if (sex === 'female') return 1500;
  return 1700;
}

// ------------------------------------------------------------------ greutate și consum estimat

export interface WeightPoint {
  date: string;
  kg: number;
  trend: number;
}

/** Media mobilă exponențială netezește variațiile zilnice (apă, mese). */
export function weightTrend(logs: LocalNutritionLog[], alpha = 0.1): WeightPoint[] {
  const weights = logs
    .filter((l) => l.body_weight_kg !== null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  const out: WeightPoint[] = [];
  let trend = 0;
  weights.forEach((l, i) => {
    const kg = l.body_weight_kg as number;
    trend = i === 0 ? kg : trend + alpha * (kg - trend);
    out.push({ date: l.log_date, kg, trend });
  });
  return out;
}

export interface ExpenditureEstimate {
  kcal: number;
  intakeDays: number;
  windowDays: number;
}

const KCAL_PER_KG = 7700;

/**
 * Consumul estimat din ce ai mâncat și cum s-a mișcat trendul greutății:
 * consum = medie(calorii mâncate) - variația trendului (kg) x 7700 / zile.
 * Cere măcar 10 zile cu mâncare notată și greutăți la începutul și la finalul intervalului.
 */
export function estimateExpenditure(
  trend: WeightPoint[],
  intakeByDate: Map<string, number>,
  today: string,
  windowDays = 21,
): ExpenditureEstimate | null {
  const from = addDays(today, -(windowDays - 1));
  const inWindow = trend.filter((p) => p.date >= from && p.date <= today);
  if (inWindow.length < 2) return null;

  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const span =
    Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86_400_000) || 0;
  if (span < 10) return null;

  let total = 0;
  let days = 0;
  for (let i = 0; i <= span; i += 1) {
    const kcal = intakeByDate.get(addDays(first.date, i));
    if (kcal && kcal > 300) {
      total += kcal;
      days += 1;
    }
  }
  if (days < 10) return null;

  const avgIntake = total / days;
  const kcal = avgIntake - ((last.trend - first.trend) * KCAL_PER_KG) / span;
  return { kcal: Math.round(kcal / 10) * 10, intakeDays: days, windowDays: span };
}
