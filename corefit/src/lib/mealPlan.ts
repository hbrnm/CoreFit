import { CATALOG_RECIPES, type CatalogRecipe } from '../data/recipes';
import { FOODS } from '../data/foods';
import type { Meal, MealPlan } from './db';
import { mealKcalTarget, perServing, recipeTotals, ZERO_TOTALS, type Totals } from './nutrition';

const BY_ID = new Map(CATALOG_RECIPES.map((recipe) => [recipe.id, recipe]));
const CATEGORY = new Map(FOODS.map((food) => [food.name, food.category]));

/** Luni e prima zi din șablon, indiferent de preferința de săptămână. */
const WEEK_TEMPLATE: ReadonlyArray<{ breakfast: string; lunch: string; dinner: string }> = [
  { breakfast: 'yogurt-bowl', lunch: 'cacciatora', dinner: 'fakes' },
  { breakfast: 'oats-banana', lunch: 'pesto', dinner: 'chicken-lemon' },
  { breakfast: 'shakshuka', lunch: 'pasta-fagioli', dinner: 'insalata-salmone' },
  { breakfast: 'yogurt-bowl', lunch: 'parmigiana', dinner: 'tuna-beans' },
  { breakfast: 'tortilla', lunch: 'fasolada', dinner: 'gamberi-guazetto' },
  { breakfast: 'oats-banana', lunch: 'tagliatelle-burrata', dinner: 'tuna-beans' },
  { breakfast: 'shakshuka', lunch: 'linguine-gamberi', dinner: 'chicken-lemon' },
];

const MIN_PORTIONS = 0.5;
const MAX_PORTIONS = 2.5;

export interface PlannedSlot {
  meal: Meal;
  recipe: CatalogRecipe;
  portions: number;
  totals: Totals;
}

export interface PlannedDay {
  date: string;
  slots: PlannedSlot[];
  totals: Totals;
}

export interface PortionLine {
  name: string;
  grams: number;
}

/** Partea din oală pentru porțiile alese. Include apa de gătit. */
export function portionLines(slot: PlannedSlot): PortionLine[] {
  const factor = slot.portions / slot.recipe.servings;
  return slot.recipe.ingredients
    .map((item) => ({ name: item.name, grams: Math.round(item.grams * factor) }))
    .filter((line) => line.grams >= 1);
}

export function portionWeight(slot: PlannedSlot): number {
  return portionLines(slot).reduce((sum, line) => sum + line.grams, 0);
}

export interface ShopLine {
  name: string;
  grams: number;
  category: string;
}

function recipeOrThrow(id: string): CatalogRecipe {
  const recipe = BY_ID.get(id);
  if (!recipe) throw new Error(`Rețetă lipsă din plan: ${id}`);
  return recipe;
}

function scale(totals: Totals, factor: number): Totals {
  return {
    kcal: totals.kcal * factor,
    protein: totals.protein * factor,
    carbs: totals.carbs * factor,
    fat: totals.fat * factor,
    fiber: totals.fiber * factor,
    sugar: totals.sugar * factor,
    sodium: totals.sodium * factor,
  };
}

function add(a: Totals, b: Totals): Totals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
    sodium: a.sodium + b.sodium,
  };
}

/** Jumătatea de porție cea mai apropiată de caloriile mesei. */
function portionsFor(perPortionKcal: number, targetKcal: number): number {
  if (targetKcal <= 0 || perPortionKcal <= 0) return 1;
  let best = MIN_PORTIONS;
  let bestGap = Infinity;
  for (let portions = MIN_PORTIONS; portions <= MAX_PORTIONS + 0.001; portions += 0.5) {
    const gap = Math.abs(perPortionKcal * portions - targetKcal);
    if (gap < bestGap) {
      best = portions;
      bestGap = gap;
    }
  }
  return best;
}

function mealsFor(plan: MealPlan): Meal[] {
  if (plan === 'omad') return ['dinner'];
  if (plan === 'two_meal') return ['breakfast', 'dinner'];
  return ['breakfast', 'lunch', 'dinner'];
}

function recipeIdFor(day: (typeof WEEK_TEMPLATE)[number], meal: Meal, plan: MealPlan): string {
  if (plan === 'omad') return day.lunch;
  if (meal === 'snack') return day.lunch;
  return day[meal];
}

export function buildWeek(args: {
  dates: readonly string[];
  mealPlan: MealPlan;
  kcalTarget: number | null;
  proteinTarget: number | null;
}): PlannedDay[] {
  const meals = mealsFor(args.mealPlan);
  return args.dates.map((date, index) => {
    const template = WEEK_TEMPLATE[index % WEEK_TEMPLATE.length];
    const slots: PlannedSlot[] = meals.map((meal) => {
      const recipe = recipeOrThrow(recipeIdFor(template, meal, args.mealPlan));
      const per = perServing(recipeTotals(recipe.ingredients), recipe.servings);
      const target = args.kcalTarget === null ? per.kcal : mealKcalTarget(args.kcalTarget, args.mealPlan, meal);
      const portions = args.kcalTarget === null ? 1 : portionsFor(per.kcal, target);
      return { meal, recipe, portions, totals: scale(per, portions) };
    });

    if (args.kcalTarget !== null && args.proteinTarget !== null) {
      const proteinNow = () => slots.reduce((sum, slot) => sum + slot.totals.protein, 0);
      const kcalNow = () => slots.reduce((sum, slot) => sum + slot.totals.kcal, 0);
      for (let pass = 0; pass < 2 && proteinNow() < args.proteinTarget * 0.85; pass += 1) {
        const ranked = [...slots]
          .filter((slot) => slot.portions + 0.5 <= MAX_PORTIONS)
          .sort((a, b) => b.totals.protein / b.totals.kcal - a.totals.protein / a.totals.kcal);
        const candidate = ranked.find((slot) => {
          const perKcal = slot.totals.kcal / slot.portions;
          const mealTarget = mealKcalTarget(args.kcalTarget ?? 0, args.mealPlan, slot.meal);
          const withinMeal = slot.totals.kcal + perKcal * 0.5 <= mealTarget * 1.5;
          const withinDay = kcalNow() + perKcal * 0.5 <= (args.kcalTarget ?? 0) * 1.05;
          return withinMeal && withinDay;
        });
        if (!candidate) break;
        candidate.portions += 0.5;
        candidate.totals = scale(perServing(recipeTotals(candidate.recipe.ingredients), candidate.recipe.servings), candidate.portions);
      }
    }

    return {
      date,
      slots,
      totals: slots.reduce((sum, slot) => add(sum, slot.totals), ZERO_TOTALS),
    };
  });
}

const CATEGORY_ORDER = [
  'Carne și pește',
  'Ouă și lactate',
  'Cereale și leguminoase',
  'Legume',
  'Fructe',
  'Nuci și semințe',
  'Grăsimi și dulciuri',
  'Condimente',
];

/** Grame de cumpărat pentru zilele alese. Apa nu se cumpără. */
export function shoppingList(days: readonly PlannedDay[]): ShopLine[] {
  const grams = new Map<string, number>();
  for (const day of days) {
    for (const slot of day.slots) {
      const factor = slot.portions / slot.recipe.servings;
      for (const item of slot.recipe.ingredients) {
        if (item.name === 'Apă') continue;
        grams.set(item.name, (grams.get(item.name) ?? 0) + item.grams * factor);
      }
    }
  }
  const lines: ShopLine[] = [];
  for (const [name, total] of grams) {
    const rounded = Math.round(total);
    if (rounded < 1) continue;
    lines.push({ name, grams: rounded, category: CATEGORY.get(name) ?? 'Altele' });
  }
  return lines.sort((a, b) => {
    const category = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (category !== 0) return category;
    return a.name.localeCompare(b.name, 'ro');
  });
}
