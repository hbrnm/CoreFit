import { db, gramsFromAmountText, newId, nowIso, stamp, type FoodSource, type LocalFoodEntry, type LocalNutritionLog, type Meal } from './db';
import { addDays } from './date';
import { rescaleEntry } from './foodEdit';
import type { Totals } from './nutrition';

export const MEALS: ReadonlyArray<{ id: Meal; label: string }> = [
  { id: 'breakfast', label: 'Mic dejun' },
  { id: 'lunch', label: 'Prânz' },
  { id: 'dinner', label: 'Cină' },
  { id: 'snack', label: 'Gustări' },
];

export async function addEntry(
  userId: string,
  date: string,
  meal: Meal,
  name: string,
  amountText: string,
  totals: Totals,
  source: FoodSource,
  /** gramajul numeric; implicit citit din text („150 g”), null la porții */
  grams: number | null = gramsFromAmountText(amountText),
): Promise<void> {
  const round = (n: number) => Math.round(n * 10) / 10;
  await db.foodEntries.put({
    id: newId(),
    user_id: userId,
    log_date: date,
    meal,
    name,
    amount_text: amountText,
    grams: grams === null ? null : Math.round(grams * 10) / 10,
    kcal: round(totals.kcal),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fat: round(totals.fat),
    fiber: round(totals.fiber),
    sugar: round(totals.sugar),
    sodium: Math.round(totals.sodium ?? 0),
    source,
    logged_at: nowIso(),
    deleted: false,
    ...stamp(),
  });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.foodEntries.update(id, { deleted: true, ...stamp() });
}

/** Alt gramaj pentru un aliment notat; valorile se recalculează proporțional. False dacă nu se poate. */
export async function changeEntryGrams(id: string, grams: number): Promise<boolean> {
  const entry = await db.foodEntries.get(id);
  const next = entry ? rescaleEntry(entry, grams) : null;
  if (!next) return false;
  await db.foodEntries.update(id, { ...next, ...stamp() });
  return true;
}

export async function moveEntry(id: string, meal: Meal): Promise<void> {
  await db.foodEntries.update(id, { meal, ...stamp() });
}

export async function entriesForDate(userId: string, date: string): Promise<LocalFoodEntry[]> {
  const list = await db.foodEntries
    .where('[user_id+log_date]')
    .equals([userId, date])
    .filter((e) => !e.deleted)
    .toArray();
  return list.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

/** Copiază mesele unei zile în alta (ex. "ca ieri"). */
export async function copyDay(userId: string, from: string, to: string): Promise<number> {
  const source = await entriesForDate(userId, from);
  for (const e of source) {
    await db.foodEntries.put({
      ...e,
      id: newId(),
      log_date: to,
      logged_at: nowIso(),
      deleted: false,
      ...stamp(),
    });
  }
  return source.length;
}

type DayPatch = Partial<
  Pick<LocalNutritionLog, 'body_weight_kg' | 'water_ml' | 'sugar_free_respected' | 'flour_free_respected'>
>;

/** Un rând pe zi: greutate, apă și provocarea. Se creează la prima modificare. */
export async function upsertDay(userId: string, date: string, patch: DayPatch): Promise<void> {
  const existing = await db.nutritionLogs.get([userId, date]);
  const base: LocalNutritionLog = existing ?? {
    user_id: userId,
    log_date: date,
    body_weight_kg: null,
    water_ml: 0,
    sugar_free_respected: null,
    flour_free_respected: null,
    ...stamp(),
  };
  await db.nutritionLogs.put({ ...base, ...patch, ...stamp() });
}

/** Caloriile mâncate, pe zile, pentru estimarea consumului. */
export async function intakeByDate(userId: string, from: string, to: string): Promise<Map<string, number>> {
  const entries = await db.foodEntries
    .where('[user_id+log_date]')
    .between([userId, from], [userId, to], true, true)
    .filter((e) => !e.deleted)
    .toArray();
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.log_date, (map.get(e.log_date) ?? 0) + e.kcal);
  return map;
}

export interface Repeatable {
  key: string;
  name: string;
  amountText: string;
  meal: Meal;
  totals: Totals;
  source: FoodSource;
  times: number;
  yesterday: boolean;
}

/** Alimente din ultimele 30 de zile, gata de re-adăugat. Ieri e primul, apoi cele mai dese. */
export async function repeatables(userId: string, date: string): Promise<Repeatable[]> {
  const from = addDays(date, -30);
  const yesterday = addDays(date, -1);
  const rows = await db.foodEntries
    .where('[user_id+log_date]')
    .between([userId, from], [userId, yesterday], true, true)
    .filter((e) => !e.deleted)
    .toArray();

  const groups = new Map<string, Repeatable & { last: string }>();
  for (const e of rows) {
    const key = `${e.name.trim().toLowerCase()}|${e.amount_text.trim().toLowerCase()}`;
    const totals: Totals = {
      kcal: e.kcal,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      fiber: e.fiber,
      sugar: e.sugar,
      sodium: e.sodium ?? 0,
    };
    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, {
        key,
        name: e.name,
        amountText: e.amount_text,
        meal: e.meal,
        totals,
        source: e.source,
        times: 1,
        yesterday: e.log_date === yesterday,
        last: e.log_date,
      });
      continue;
    }
    prev.times += 1;
    if (e.log_date >= prev.last) {
      prev.last = e.log_date;
      prev.meal = e.meal;
      prev.totals = totals;
      prev.name = e.name;
      prev.amountText = e.amount_text;
      prev.source = e.source;
    }
    if (e.log_date === yesterday) prev.yesterday = true;
  }

  return [...groups.values()]
    .sort((a, b) => {
      if (a.yesterday !== b.yesterday) return a.yesterday ? -1 : 1;
      if (b.times !== a.times) return b.times - a.times;
      return b.last.localeCompare(a.last);
    })
    .slice(0, 8)
    .map(({ last, ...item }) => {
      void last;
      return item;
    });
}

