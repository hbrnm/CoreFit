import { normalize } from './ingredients';

/*
 * Import de rețete: din text lipit sau din JSON-LD (schema.org/Recipe) dintr-o pagină.
 * Partea de aici doar citește și interpretează; potrivirea cu alimente e în foodMatch.ts.
 */

type UnitKind = 'mass' | 'volume' | 'piece';

interface UnitDef {
  kind: UnitKind;
  /** grame pentru masă, mililitri pentru volum, grame pe bucată (dacă se știe) pentru bucăți */
  factor: number;
}

const UNITS: Record<string, UnitDef> = {
  g: { kind: 'mass', factor: 1 },
  gr: { kind: 'mass', factor: 1 },
  gram: { kind: 'mass', factor: 1 },
  grame: { kind: 'mass', factor: 1 },
  kg: { kind: 'mass', factor: 1000 },
  kilogram: { kind: 'mass', factor: 1000 },
  kilograme: { kind: 'mass', factor: 1000 },
  oz: { kind: 'mass', factor: 28.35 },
  lb: { kind: 'mass', factor: 453.6 },
  ml: { kind: 'volume', factor: 1 },
  cl: { kind: 'volume', factor: 10 },
  dl: { kind: 'volume', factor: 100 },
  l: { kind: 'volume', factor: 1000 },
  litru: { kind: 'volume', factor: 1000 },
  litri: { kind: 'volume', factor: 1000 },
  lingura: { kind: 'volume', factor: 15 },
  linguri: { kind: 'volume', factor: 15 },
  tbsp: { kind: 'volume', factor: 15 },
  tablespoon: { kind: 'volume', factor: 15 },
  tablespoons: { kind: 'volume', factor: 15 },
  lingurita: { kind: 'volume', factor: 5 },
  lingurite: { kind: 'volume', factor: 5 },
  tsp: { kind: 'volume', factor: 5 },
  teaspoon: { kind: 'volume', factor: 5 },
  teaspoons: { kind: 'volume', factor: 5 },
  cana: { kind: 'volume', factor: 250 },
  cani: { kind: 'volume', factor: 250 },
  cup: { kind: 'volume', factor: 240 },
  cups: { kind: 'volume', factor: 240 },
  pahar: { kind: 'volume', factor: 200 },
  pahare: { kind: 'volume', factor: 200 },
  bucata: { kind: 'piece', factor: 0 },
  bucati: { kind: 'piece', factor: 0 },
  buc: { kind: 'piece', factor: 0 },
  felie: { kind: 'piece', factor: 0 },
  felii: { kind: 'piece', factor: 0 },
  catel: { kind: 'piece', factor: 4 },
  catei: { kind: 'piece', factor: 4 },
  clove: { kind: 'piece', factor: 4 },
  cloves: { kind: 'piece', factor: 4 },
};

/** Grame pe mililitru, pentru ingredientele măsurate în linguri, căni etc. Restul se socotesc ca apa. */
const DENSITY: Record<string, number> = {
  'olive-oil': 0.92,
  'sunflower-oil': 0.92,
  butter: 0.96,
  'flour-white': 0.53,
  sugar: 0.85,
  honey: 1.42,
  'milk-whole': 1.03,
  oats: 0.38,
  'rice-raw': 0.8,
  cornmeal: 0.65,
  'peanut-butter': 1.1,
  'sour-cream': 1.0,
  'yogurt-whole': 1.03,
  'greek-yogurt-0': 1.05,
  salt: 1.2,
};

const NUMBER_WORDS: Record<string, number> = {
  un: 1, o: 1, una: 1, unu: 1, doi: 2, doua: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8,
  noua: 9, zece: 10, jumatate: 0.5,
};

const VULGAR: Record<string, string> = { '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3', '⅛': ' 1/8' };

const PINCH = /\b(dupa gust|un praf|praf de|varf de cutit|un pic|putin|putina|to taste|pinch)\b/;

export interface ParsedLine {
  raw: string;
  name: string;
  amount: number | null;
  unit: string | null;
  /** grame indicate între paranteze, ex. "1 conservă (400 g)" */
  parenGrams: number | null;
  pinch: boolean;
}

const num = (s: string): number => Number(s.replace(',', '.'));

function takeQuantity(input: string): { value: number; rest: string } | null {
  let s = input;
  for (const [k, v] of Object.entries(VULGAR)) s = s.split(k).join(v);
  s = s.trim();

  let m = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
  if (m) return { value: (num(m[1]) + num(m[2])) / 2, rest: s.slice(m[0].length) };

  m = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m) return { value: Number(m[1]) + Number(m[2]) / Number(m[3]), rest: s.slice(m[0].length) };

  m = s.match(/^(\d+)\/(\d+)/);
  if (m) return { value: Number(m[1]) / Number(m[2]), rest: s.slice(m[0].length) };

  m = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (m) return { value: num(m[1]), rest: s.slice(m[0].length) };

  return null;
}

/** Interpretează o linie de ingredient: cantitate, unitate, nume. */
export function parseIngredientLine(rawLine: string): ParsedLine {
  const raw = rawLine.trim();
  let text = raw.replace(/^[-–•*·]+\s*/, '');

  // grame între paranteze
  let parenGrams: number | null = null;
  const paren = normalize(text).match(/\((?:~|aprox\.?\s*)?(\d+(?:[.,]\d+)?)\s*(g|gr|grame|kg|ml|l)\b[^)]*\)/);
  if (paren) {
    const factor = paren[2] === 'kg' || paren[2] === 'l' ? 1000 : 1;
    parenGrams = num(paren[1]) * factor;
  }
  text = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  const pinch = PINCH.test(normalize(text));

  let amount: number | null = null;
  let unit: string | null = null;
  let rest = text;

  const q = takeQuantity(text);
  if (q) {
    amount = q.value;
    rest = q.rest;
  } else {
    const norm = normalize(text);
    const w = norm.match(/^(un|o|una|unu|doi|doua|trei|patru|cinci|sase|sapte|opt|noua|zece|jumatate)\b/);
    if (w) {
      amount = NUMBER_WORDS[w[1]];
      rest = text.slice(w[0].length);
    }
  }

  if (amount !== null) {
    const m = normalize(rest).match(/^\s*([a-z]+)\.?(?=\s|$)/);
    if (m && UNITS[m[1]]) {
      unit = m[1];
      // tăiem unitatea din textul original (aceeași lungime: normalize păstrează lungimea la diacritice combinate)
      const idx = rest.toLowerCase().search(/[a-zăâîșțşţ]/i);
      const after = idx >= 0 ? rest.slice(idx).replace(/^[a-zăâîșțşţ]+\.?/i, '') : '';
      rest = after;
    }
  }

  let name = rest
    .replace(/^[\s.:,-]+/, '')
    .replace(/^de\s+/i, '')
    .split(',')[0]
    .replace(PINCH, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name === '') name = raw.replace(/\([^)]*\)/g, '').trim();

  return { raw, name, amount, unit, parenGrams, pinch };
}

/** Transformă cantitatea în grame. `null` = nu se poate ști; omul completează. */
export function toGrams(
  p: Pick<ParsedLine, 'amount' | 'unit' | 'parenGrams' | 'pinch'>,
  food: { foodId?: string; servingG: number | null } | null,
): number | null {
  if (p.pinch && p.amount === null) return 1;
  if (p.amount === null) return null;

  const def = p.unit ? UNITS[p.unit] : undefined;
  if (def?.kind === 'mass') return p.amount * def.factor;
  if (p.parenGrams && (!def || def.kind === 'piece')) return p.amount * p.parenGrams;
  if (def?.kind === 'volume') return p.amount * def.factor * (food?.foodId ? (DENSITY[food.foodId] ?? 1) : 1);
  if (def?.kind === 'piece' && def.factor > 0) return p.amount * def.factor;
  if (food?.servingG) return p.amount * food.servingG;
  return null;
}

// ------------------------------------------------------------------ recipe întreagă

export interface ParsedRecipe {
  name: string;
  servings: number | null;
  lines: ParsedLine[];
}

const INGREDIENT_HEADING = /^(ingrediente|ingredients?)\b/;
const STOP_HEADING = /^(mod de preparare|preparare|instructiuni|instructions?|directions?|method|pasi|etape)\b/;

function findServings(lines: string[]): number | null {
  for (const l of lines) {
    const n = normalize(l);
    const a = n.match(/(\d+)\s*(portii|portie|persoane|servings?|serves)\b/);
    if (a) return Number(a[1]);
    const b = n.match(/\b(portii|persoane|serves|servings?|yield)\s*[:\-]?\s*(\d+)/);
    if (b) return Number(b[2]);
  }
  return null;
}

/** Interpretează o rețetă lipită ca text: titlu, porții, ingrediente. */
export function parseRecipeText(text: string): ParsedRecipe {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headingAt = rows.findIndex((l) => INGREDIENT_HEADING.test(normalize(l)) && l.length < 40);
  const stopAt = rows.findIndex((l, i) => i > headingAt && STOP_HEADING.test(normalize(l)) && l.length < 40);
  const end = stopAt === -1 ? rows.length : stopAt;

  let ingredientRows: string[];
  if (headingAt !== -1) {
    ingredientRows = rows.slice(headingAt + 1, end);
  } else {
    const limit = rows.findIndex((l) => STOP_HEADING.test(normalize(l)) && l.length < 40);
    ingredientRows = rows.slice(0, limit === -1 ? rows.length : limit).filter((l) => takeQuantity(l.replace(/^[-–•*·]+\s*/, '')) !== null || /^(un|o|una|doi|doua|trei|jumatate)\s/.test(normalize(l)));
  }

  const first = rows[0] ?? '';
  const looksLikeTitle =
    headingAt !== 0 && first.length > 0 && first.length < 80 && !INGREDIENT_HEADING.test(normalize(first)) && takeQuantity(first) === null;

  return {
    name: looksLikeTitle ? first.replace(/^titlu\s*:\s*/i, '') : '',
    servings: findServings(rows),
    lines: ingredientRows
      .filter((l) => !/^(pentru|sos|blat|crema|umplutura|decor)\b.*:$/i.test(normalize(l)))
      .map(parseIngredientLine),
  };
}

// ------------------------------------------------------------------ JSON-LD

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

function isRecipeNode(node: Record<string, unknown>): boolean {
  const t = node['@type'];
  return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findRecipeNode(n);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (isRecipeNode(obj)) return obj;
    if (obj['@graph']) return findRecipeNode(obj['@graph']);
  }
  return null;
}

function yieldToNumber(v: unknown): number | null {
  const first = Array.isArray(v) ? v[0] : v;
  if (typeof first === 'number') return first > 0 ? first : null;
  if (typeof first === 'string') {
    const m = first.match(/\d+/);
    return m ? Number(m[0]) : null;
  }
  return null;
}

/** Caută o rețetă structurată (schema.org/Recipe) în HTML. */
export function extractRecipeFromHtml(html: string): ParsedRecipe | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(data);
    if (!node) continue;

    const rawIngredients = node['recipeIngredient'] ?? node['ingredients'];
    if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) continue;

    return {
      name: typeof node['name'] === 'string' ? decodeEntities(node['name']) : '',
      servings: yieldToNumber(node['recipeYield']),
      lines: rawIngredients
        .filter((x): x is string => typeof x === 'string')
        .map((x) => parseIngredientLine(decodeEntities(x))),
    };
  }
  return null;
}
