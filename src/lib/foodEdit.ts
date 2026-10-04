import type { LocalFoodEntry } from './db';
import { formatNum } from './numbers';

/*
 * Jurnalul de mâncare: schimbarea gramajului unui aliment deja notat și textele din sumar.
 * Valorile se recalculează proporțional, din cele notate, fără să mai caute alimentul.
 */

export type EntryNutrients = Pick<LocalFoodEntry, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium'>;

/** Cel mai mare gramaj acceptat pentru un singur aliment notat. */
export const MAX_ENTRY_GRAMS = 5000;

const one = (n: number) => Math.round(n * 10) / 10;

/**
 * Aceleași valori pentru alt gramaj: 250 g → 200 g înseamnă tot × 0,8.
 * Null când gramajul vechi nu se știe (porții, adăugare rapidă) sau cel nou nu e valid.
 */
export function rescaleEntry(entry: EntryNutrients & { grams: number | null }, grams: number): (EntryNutrients & { grams: number; amount_text: string }) | null {
  if (!entry.grams || entry.grams <= 0 || !(grams > 0) || grams > MAX_ENTRY_GRAMS) return null;
  const f = grams / entry.grams;
  return {
    grams: one(grams),
    amount_text: `${formatNum(grams, 0)} g`,
    kcal: one(entry.kcal * f),
    protein: one(entry.protein * f),
    carbs: one(entry.carbs * f),
    fat: one(entry.fat * f),
    fiber: one(entry.fiber * f),
    sugar: one(entry.sugar * f),
    sodium: Math.round((entry.sodium ?? 0) * f),
  };
}

/** „din 2.400 · mai ai 560” sau „din 2.400 · cu 120 peste”. */
export function kcalLeftText(eaten: number, target: number): string {
  const diff = Math.round(target - eaten);
  return diff >= 0 ? `din ${formatNum(target, 0)} · mai ai ${formatNum(diff, 0)}` : `din ${formatNum(target, 0)} · cu ${formatNum(-diff, 0)} peste`;
}

/** Rândul din jurnal: „Iaurt grecesc · 250 g”. */
export function entryLine(entry: Pick<LocalFoodEntry, 'name' | 'amount_text'>): string {
  return entry.amount_text ? `${entry.name} · ${entry.amount_text}` : entry.name;
}
