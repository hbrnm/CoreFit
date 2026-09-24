import { FOODS } from '../data/foods';
import type { FoodSource, LocalCustomFood, Per100 } from './db';
import { normalize } from './ingredients';

/** Un aliment ales sau găsit, gata de cantitate. */
export interface PickedFood {
  name: string;
  brand: string;
  per100: Per100;
  servingG: number | null;
  source: FoodSource;
  /** id-ul din lista predefinită, dacă e cazul (folosit pentru densitate) */
  foodId?: string;
}

export function builtinPool(): PickedFood[] {
  return FOODS.map((f) => ({
    name: f.name,
    brand: '',
    per100: f,
    servingG: f.servingG ?? null,
    source: 'builtin' as const,
    foodId: f.id,
  }));
}

export function customPool(custom: LocalCustomFood[]): PickedFood[] {
  return custom.map((f) => ({
    name: f.name,
    brand: f.brand,
    per100: f,
    servingG: f.serving_g,
    source: 'custom' as const,
  }));
}

const STOP = new Set([
  'de', 'din', 'si', 'cu', 'la', 'a', 'un', 'o', 'proaspat', 'proaspata', 'proaspete', 'proaspeti',
  'mare', 'mari', 'mic', 'mica', 'mici', 'mijlocie', 'mijlocii', 'dupa', 'gust', 'optional', 'bucati',
  'felii', 'fin', 'taiat', 'taiata', 'taiate', 'feliat', 'rasa', 'ras', 'curatat', 'curatata', 'spalat',
]);

const IRREGULAR: Record<string, string> = {
  oua: 'ou', ouale: 'ou', oul: 'ou', rosii: 'rosi', rosie: 'rosi', rosiile: 'rosi',
};

function stem(t: string): string {
  if (IRREGULAR[t]) return IRREGULAR[t];
  return t.length > 4 ? t.slice(0, Math.max(4, t.length - 2)) : t;
}

export function tokens(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t))
    .map(stem);
}

/** 1 = același cuvânt, 0,7 = unul e prefixul celuilalt (variantă de flexiune), 0 = nimic. */
function tokenSim(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.7;
  return 0;
}

/** Cea mai bună potrivire a lui `t` în lista `list`, ca scor 0-1. */
function bestSim(t: string, list: string[]): number {
  return Math.max(0, ...list.map((x) => tokenSim(t, x)));
}

/** 0 = nimic în comun, 1 = potrivire completă (cuvinte identice, fără cuvinte în plus). */
export function matchScore(query: string, foodName: string): number {
  const q = tokens(query);
  const f = tokens(foodName);
  if (q.length === 0 || f.length === 0) return 0;

  const matchedQ = q.reduce((sum, t) => sum + bestSim(t, f), 0);
  if (matchedQ === 0) return 0;
  const matchedF = f.reduce((sum, t) => sum + bestSim(t, q), 0);

  let score = (0.7 * matchedQ) / q.length + (0.3 * matchedF) / f.length;
  // rețetele folosesc de obicei ingrediente crude
  if (/gatit|fiert|fript/.test(normalize(foodName)) && !/gatit|fiert|fript/.test(normalize(query))) score -= 0.1;
  return score;
}

export interface Candidate {
  food: PickedFood;
  score: number;
}

export function matchFoods(name: string, pool: PickedFood[], limit = 4): Candidate[] {
  return pool
    .map((food) => ({ food, score: matchScore(name, `${food.name} ${food.brand}`) }))
    .filter((c) => c.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Sub acest prag alegerea automată nu e sigură: rândul e marcat pentru verificare. */
export const CONFIDENT = 0.6;
