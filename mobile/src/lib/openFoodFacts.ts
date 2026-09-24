export interface RomanianFoodProduct {
  id: string;
  name: string;
  brand: string;
  barcode?: string;
  calories: number; // per 100g
  protein: number;  // per 100g
  carbs: number;    // per 100g
  fat: number;      // per 100g
  servingSize?: string;
}

const USER_AGENT = 'CoreFitMobile/1.0 (iOS; contact@corefit.app)';

// Cauta un produs dupa codul de bare (EAN-13, UPC) pe Open Food Facts
export async function fetchProductByBarcode(barcode: string): Promise<RomanianFoodProduct | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode.trim()}.json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    const name = p.product_name_ro || p.product_name || p.generic_name || 'Produs fără nume';
    const brand = p.brands || '';
    const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
    const protein = Math.round((nutriments['proteins_100g'] || nutriments.proteins || 0) * 10) / 10;
    const carbs = Math.round((nutriments['carbohydrates_100g'] || nutriments.carbohydrates || 0) * 10) / 10;
    const fat = Math.round((nutriments['fat_100g'] || nutriments.fat || 0) * 10) / 10;

    return {
      id: barcode,
      name: brand ? `${name} (${brand})` : name,
      brand,
      barcode,
      calories,
      protein,
      carbs,
      fat,
      servingSize: p.serving_size || '100g',
    };
  } catch (err) {
    console.warn('Eroare la scanare cod de bare:', err);
    return null;
  }
}

// Cauta produse romanesti pe baza de text pe Open Food Facts Romania (Kaufland, Lidl, Carrefour, Napolact, etc.)
export async function searchRomanianFoods(query: string): Promise<RomanianFoodProduct[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://ro.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query.trim()
    )}&search_simple=1&action=process&json=1&page_size=15`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();

    if (!data.products || !Array.isArray(data.products)) return [];

    return data.products
      .filter((p: any) => p.product_name || p.product_name_ro)
      .map((p: any) => {
        const nutriments = p.nutriments || {};
        const name = p.product_name_ro || p.product_name || 'Produs';
        const brand = p.brands || '';
        const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);
        const protein = Math.round((nutriments['proteins_100g'] || nutriments.proteins || 0) * 10) / 10;
        const carbs = Math.round((nutriments['carbohydrates_100g'] || nutriments.carbohydrates || 0) * 10) / 10;
        const fat = Math.round((nutriments['fat_100g'] || nutriments.fat || 0) * 10) / 10;

        return {
          id: p.code || p._id || Math.random().toString(),
          name: brand ? `${name} (${brand})` : name,
          brand,
          barcode: p.code,
          calories,
          protein,
          carbs,
          fat,
          servingSize: p.serving_size || '100g',
        };
      });
  } catch (err) {
    console.warn('Eroare la cautare alimente Romania:', err);
    return [];
  }
}
