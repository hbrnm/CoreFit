import type { Per100 } from './db';

/** Open Food Facts: bază de date deschisă (ODbL) cu produse de pe etichete, căutabile după cod de bare. */
export interface OffProduct {
  barcode: string;
  name: string;
  brand: string;
  per100: Per100;
  servingG: number | null;
}

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,brands,nutriments,serving_quantity';

interface OffRaw {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: number | string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parse(raw: OffRaw): OffProduct | null {
  const n = raw.nutriments;
  if (!n || !raw.product_name) return null;

  // energy-kcal_100g lipsește uneori; energy_100g este în kJ
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === 0) kcal = num(n['energy_100g']) / 4.184;
  if (kcal === 0) return null;

  const serving = num(raw.serving_quantity);
  return {
    barcode: raw.code ?? '',
    name: raw.product_name.trim(),
    brand: (raw.brands ?? '').split(',')[0].trim(),
    per100: {
      kcal100: Math.round(kcal),
      protein100: num(n['proteins_100g']),
      carbs100: num(n['carbohydrates_100g']),
      fat100: num(n['fat_100g']),
      fiber100: num(n['fiber_100g']),
      sugar100: num(n['sugars_100g']),
      sodium100: sodiumMgPer100(n),
    },
    servingG: serving > 0 ? serving : null,
  };
}

/** Open Food Facts dă sodiul în grame la 100 g. Sarea, dacă lipsește sodiul, e NaCl: sodiu = sare / 2,5. */
function sodiumMgPer100(n: Record<string, number | string | undefined>): number {
  const sodiumG = num(n['sodium_100g']);
  const mg = sodiumG > 0 ? sodiumG * 1000 : num(n['salt_100g']) > 0 ? (num(n['salt_100g']) / 2.5) * 1000 : 0;
  return Math.min(40_000, Math.round(mg));
}

export async function fetchByBarcode(barcode: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const code = barcode.replace(/\D/g, '');
  if (code.length < 8) return null;
  const res = await fetch(`${BASE}/api/v2/product/${code}.json?fields=${FIELDS}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: OffRaw };
  if (data.status !== 1 || !data.product) return null;
  return parse({ ...data.product, code });
}

export async function searchOff(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=20&lc=ro&fields=${FIELDS}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Căutarea Open Food Facts a eșuat.');
  const data = (await res.json()) as { products?: OffRaw[] };
  return (data.products ?? []).map(parse).filter((p): p is OffProduct => p !== null);
}
