/**
 * Scaner de etichete pentru regula "fără zahăr, fără făină".
 * Etichetele românești au diacritice ("zahăr", "făină", "glucoză"), deci comparăm
 * întotdeauna textul normalizat (fără diacritice, litere mici).
 */

/** Câte ingrediente de la începutul listei contează pentru regula etichetei. */
export const TOP_INGREDIENTS = 5;

/** Zahăr și făină: pe ele se bazează promisiunea. */
const REJECT_TERMS = [
  'zahar', // zahăr, zaharoză
  'sugar',
  'sucroza',
  'sucrose',
  'sirop',
  'syrup',
  'glucoza',
  'glucose',
  'fructoza',
  'fructose',
  'dextroza',
  'dextrose',
  'maltoza',
  'maltose',
  'faina', // făină
  'flour',
];

/** Nu sunt zahăr sau făină pur și simplu, dar merită verificate. */
const WARN_TERMS = [
  'maltodextrin', // maltodextrină, maltodextrin
  'maltitol',
  'amidon',
  'starch',
  'miere',
  'honey',
  'agave',
  'melasa',
  'molasses',
  'concentrat de fructe',
];

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Împarte lista de ingrediente la virgulă, punct și virgulă sau rând nou,
 * dar nu în interiorul parantezelor: "ciocolată (zahăr, unt de cacao)" rămâne un singur ingredient.
 */
export function splitIngredients(text: string): string[] {
  const cleaned = text.replace(/^\s*(ingrediente|ingredients)\s*:?/i, '');
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of cleaned) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if ((ch === ',' || ch === ';' || ch === '\n') && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((s) => s.trim().replace(/\.$/, '')).filter((s) => s.length > 0);
}

export interface IngredientHit {
  /** poziția în listă, începând de la 1 */
  position: number;
  text: string;
  kind: 'reject' | 'warn';
}

export interface IngredientVerdict {
  verdict: 'reject' | 'warn' | 'ok';
  hits: IngredientHit[];
  total: number;
}

export function checkIngredients(text: string): IngredientVerdict {
  const items = splitIngredients(text);
  const hits: IngredientHit[] = [];

  items.forEach((item, index) => {
    const n = normalize(item);
    if (REJECT_TERMS.some((t) => n.includes(t))) {
      hits.push({ position: index + 1, text: item, kind: 'reject' });
    } else if (WARN_TERMS.some((t) => n.includes(t))) {
      hits.push({ position: index + 1, text: item, kind: 'warn' });
    }
  });

  const rejectInTop = hits.some((h) => h.kind === 'reject' && h.position <= TOP_INGREDIENTS);
  const anyHit = hits.length > 0;

  return {
    verdict: rejectInTop ? 'reject' : anyHit ? 'warn' : 'ok',
    hits,
    total: items.length,
  };
}
