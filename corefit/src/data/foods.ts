import type { Per100 } from '../lib/db';

/*
 * Alimente uzuale, valori la 100 g, rotunjite. Sunt valori medii apropiate de USDA FoodData Central
 * (domeniu public); alimentele reale diferă. Pentru produse ambalate folosește codul de bare sau
 * eticheta, iar pentru mâncarea ta obișnuită creează un aliment propriu.
 * Telemeaua și smântâna sunt aproximări după brânza feta și smântâna obișnuită.
 */

export interface Food extends Per100 {
  id: string;
  name: string;
  category: string;
  servingG?: number;
  servingLabel?: string;
}

type Row = [
  id: string,
  name: string,
  category: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  sugar: number,
  servingG?: number,
  servingLabel?: string,
];

const ROWS: Row[] = [
  // carne și pește
  ['chicken-breast-raw', 'Piept de pui, crud', 'Carne și pește', 120, 22.5, 0, 2.6, 0, 0],
  ['chicken-breast-cooked', 'Piept de pui, gătit', 'Carne și pește', 165, 31, 0, 3.6, 0, 0],
  ['beef-mince-raw', 'Carne de vită tocată (90% slabă), crudă', 'Carne și pește', 176, 20, 0, 10, 0, 0],
  ['salmon-raw', 'Somon de crescătorie, crud', 'Carne și pește', 208, 20.4, 0, 13.4, 0, 0],
  ['tuna-water', 'Ton la conservă în apă, scurs', 'Carne și pește', 116, 25.5, 0, 0.8, 0, 0],
  ['shrimp-raw', 'Creveți, cruzi', 'Carne și pește', 85, 20.1, 0.9, 0.5, 0, 0],
  // ouă și lactate
  ['egg', 'Ou de găină, întreg', 'Ouă și lactate', 143, 12.6, 0.7, 9.5, 0, 0.4, 50, '1 ou'],
  ['milk-whole', 'Lapte integral', 'Ouă și lactate', 61, 3.2, 4.8, 3.3, 0, 5.1, 200, '1 pahar'],
  ['greek-yogurt-0', 'Iaurt grecesc simplu, 0% grăsime', 'Ouă și lactate', 59, 10.2, 3.6, 0.4, 0, 3.2, 150, '1 borcan'],
  ['yogurt-whole', 'Iaurt simplu, integral', 'Ouă și lactate', 61, 3.5, 4.7, 3.3, 0, 4.7, 150, '1 borcan'],
  ['cottage-cheese', 'Brânză de vaci (cottage), 4% grăsime', 'Ouă și lactate', 98, 11.1, 3.4, 4.3, 0, 2.7],
  ['cheddar', 'Cașcaval (tip cheddar)', 'Ouă și lactate', 403, 24.9, 1.3, 33.1, 0, 0.5, 30, '1 felie'],
  ['mozzarella', 'Mozzarella, parțial degresată', 'Ouă și lactate', 254, 24.3, 2.8, 15.9, 0, 1.1],
  ['parmesan', 'Parmezan', 'Ouă și lactate', 431, 38.5, 4.1, 28.6, 0, 0.9, 10, '1 lingură'],
  ['telemea', 'Telemea (aproximativ, ca feta)', 'Ouă și lactate', 264, 14.2, 4.1, 21.3, 0, 4.1],
  ['sour-cream', 'Smântână (aproximativ)', 'Ouă și lactate', 198, 2.4, 4.6, 19.4, 0, 3.4, 20, '1 lingură'],
  ['butter', 'Unt', 'Ouă și lactate', 717, 0.9, 0.1, 81.1, 0, 0.1, 10, '1 linguriță'],
  // cereale, cartofi și leguminoase
  ['oats', 'Fulgi de ovăz, uscați', 'Cereale și leguminoase', 389, 16.9, 66.3, 6.9, 10.6, 0, 40, '1 porție'],
  ['rice-raw', 'Orez alb, crud', 'Cereale și leguminoase', 365, 7.1, 80, 0.7, 1.3, 0.1],
  ['rice-cooked', 'Orez alb, fiert', 'Cereale și leguminoase', 130, 2.7, 28.2, 0.3, 0.4, 0.1],
  ['pasta-raw', 'Paste făinoase, crude', 'Cereale și leguminoase', 371, 13, 74.7, 1.5, 3.2, 2.7],
  ['pasta-cooked', 'Paste făinoase, fierte', 'Cereale și leguminoase', 158, 5.8, 30.9, 0.9, 1.8, 0.6],
  ['bread-white', 'Pâine albă', 'Cereale și leguminoase', 265, 9, 49, 3.2, 2.7, 5, 30, '1 felie'],
  ['bread-whole', 'Pâine integrală', 'Cereale și leguminoase', 252, 12.5, 42.7, 3.5, 6, 6, 35, '1 felie'],
  ['flour-white', 'Făină albă de grâu', 'Cereale și leguminoase', 364, 10.3, 76.3, 1, 2.7, 0.3],
  ['cornmeal', 'Mălai (făină de porumb)', 'Cereale și leguminoase', 361, 6.9, 76.9, 3.9, 7.3, 0.6],
  ['potato', 'Cartof, crud', 'Cereale și leguminoase', 77, 2, 17.5, 0.1, 2.2, 0.8, 170, '1 cartof'],
  ['sweet-potato', 'Cartof dulce, crud', 'Cereale și leguminoase', 86, 1.6, 20.1, 0.1, 3, 4.2],
  ['quinoa-cooked', 'Quinoa, gătită', 'Cereale și leguminoase', 120, 4.4, 21.3, 1.9, 2.8, 0.9],
  ['white-beans-cooked', 'Fasole albă, gătită', 'Cereale și leguminoase', 139, 9.7, 25, 0.4, 6.3, 0.3],
  ['lentils-raw', 'Linte, crudă', 'Cereale și leguminoase', 352, 24.6, 63.4, 1.1, 10.7, 2],
  ['lentils-cooked', 'Linte, gătită', 'Cereale și leguminoase', 116, 9, 20.1, 0.4, 7.9, 1.8],
  ['chickpeas-cooked', 'Năut, gătit', 'Cereale și leguminoase', 164, 8.9, 27.4, 2.6, 7.6, 4.8],
  // legume
  ['tomato', 'Roșii', 'Legume', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 120, '1 roșie'],
  ['cucumber', 'Castraveți', 'Legume', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 150, '1 castravete'],
  ['onion', 'Ceapă', 'Legume', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 110, '1 ceapă'],
  ['carrot', 'Morcov', 'Legume', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 70, '1 morcov'],
  ['broccoli', 'Broccoli, crud', 'Legume', 34, 2.8, 6.6, 0.4, 2.6, 1.7],
  ['spinach', 'Spanac, crud', 'Legume', 23, 2.9, 3.6, 0.4, 2.2, 0.4],
  ['bell-pepper', 'Ardei gras roșu', 'Legume', 31, 1, 6, 0.3, 2.1, 4.2, 150, '1 ardei'],
  ['cabbage', 'Varză albă', 'Legume', 25, 1.3, 5.8, 0.1, 2.5, 3.2],
  ['mushrooms', 'Ciuperci champignon', 'Legume', 22, 3.1, 3.3, 0.3, 1, 2],
  ['zucchini', 'Dovlecel', 'Legume', 17, 1.2, 3.1, 0.3, 1, 2.5, 200, '1 dovlecel'],
  ['eggplant', 'Vânătă, crudă', 'Legume', 25, 1, 5.9, 0.2, 3, 3.5, 250, '1 vânătă'],
  ['arugula', 'Rucola', 'Legume', 25, 2.6, 3.7, 0.7, 1.6, 2.1],
  ['basil', 'Busuioc proaspăt', 'Legume', 23, 3.2, 2.6, 0.6, 1.6, 0.3],
  ['olives', 'Măsline negre', 'Legume', 115, 0.8, 6.3, 10.7, 3.2, 0],
  ['garlic', 'Usturoi', 'Legume', 149, 6.4, 33.1, 0.5, 2.1, 1],
  ['avocado', 'Avocado', 'Legume', 160, 2, 8.5, 14.7, 6.7, 0.7, 150, '1 avocado'],
  ['lemon', 'Lămâie', 'Legume', 29, 1.1, 9.3, 0.3, 2.8, 2.5, 60, '1 lămâie'],
  ['parsley', 'Pătrunjel proaspăt', 'Legume', 36, 3, 6.3, 0.8, 3.3, 0.9],
  ['dill', 'Mărar proaspăt', 'Legume', 43, 3.5, 7, 1.1, 2.1, 0],
  // fructe
  ['banana', 'Banană', 'Fructe', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 120, '1 banană'],
  ['apple', 'Măr', 'Fructe', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 180, '1 măr'],
  ['orange', 'Portocală', 'Fructe', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 130, '1 portocală'],
  ['strawberries', 'Căpșuni', 'Fructe', 32, 0.7, 7.7, 0.3, 2, 4.9],
  ['grapes', 'Struguri', 'Fructe', 69, 0.7, 18.1, 0.2, 0.9, 15.5],
  ['blueberries', 'Afine', 'Fructe', 57, 0.7, 14.5, 0.3, 2.4, 10],
  ['watermelon', 'Pepene verde', 'Fructe', 30, 0.6, 7.6, 0.2, 0.4, 6.2],
  ['cantaloupe', 'Pepene galben', 'Fructe', 34, 0.8, 8.2, 0.2, 0.9, 7.9, 150, '1 felie'],
  ['pear', 'Pară', 'Fructe', 57, 0.4, 15.2, 0.1, 3.1, 9.8, 180, '1 pară'],
  // nuci și semințe
  ['almonds', 'Migdale', 'Nuci și semințe', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 30, '1 mână'],
  ['walnuts', 'Nuci', 'Nuci și semințe', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 30, '1 mână'],
  ['peanut-butter', 'Unt de arahide', 'Nuci și semințe', 588, 25, 20, 50, 6, 9, 16, '1 lingură'],
  ['chia', 'Semințe de chia', 'Nuci și semințe', 486, 16.5, 42.1, 30.7, 34.4, 0, 15, '1 lingură'],
  ['pine-nuts', 'Semințe de pin', 'Nuci și semințe', 673, 13.7, 13.1, 68.4, 3.7, 3.6, 10, '1 lingură'],
  // condimente și apă
  ['salt', 'Sare', 'Condimente', 0, 0, 0, 0, 0, 0],
  ['black-pepper', 'Piper negru', 'Condimente', 251, 10.4, 63.9, 3.3, 25.3, 0.6],
  ['water', 'Apă', 'Condimente', 0, 0, 0, 0, 0, 0],
  // grăsimi și dulciuri
  ['olive-oil', 'Ulei de măsline', 'Grăsimi și dulciuri', 884, 0, 0, 100, 0, 0, 10, '1 lingură'],
  ['sunflower-oil', 'Ulei de floarea-soarelui', 'Grăsimi și dulciuri', 884, 0, 0, 100, 0, 0, 10, '1 lingură'],
  ['sugar', 'Zahăr alb', 'Grăsimi și dulciuri', 387, 0, 100, 0, 0, 100, 5, '1 linguriță'],
  ['honey', 'Miere', 'Grăsimi și dulciuri', 304, 0.3, 82.4, 0, 0.2, 82.1, 20, '1 lingură'],
  ['dark-chocolate', 'Ciocolată neagră (70-85% cacao)', 'Grăsimi și dulciuri', 598, 7.8, 45.9, 42.6, 10.9, 24, 20, '2 pătrățele'],
];

/** mg/100 g, valori medii USDA pentru alimentele sărate din lista locală. Restul nu au sodiu notat. */
const SODIUM_MG_100: Record<string, number> = {
  salt: 38758,
  cheddar: 653,
  mozzarella: 619,
  telemea: 1116,
  'cottage-cheese': 364,
  'bread-white': 491,
  'bread-whole': 450,
  'tuna-water': 247,
  parmesan: 1529,
  olives: 735,
};

export const FOODS: Food[] = ROWS.map(([id, name, category, kcal, protein, carbs, fat, fiber, sugar, servingG, servingLabel]) => ({
  id,
  name,
  category,
  kcal100: kcal,
  protein100: protein,
  carbs100: carbs,
  fat100: fat,
  fiber100: fiber,
  sugar100: sugar,
  sodium100: SODIUM_MG_100[id],
  servingG,
  servingLabel,
}));
