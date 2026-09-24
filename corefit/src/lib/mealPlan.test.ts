import { describe, expect, it } from 'vitest';
import { buildWeek, portionLines, portionWeight } from './mealPlan';

describe('porțiile din plan', () => {
  it('fără țintă lasă o porție din rețetă', () => {
    const [day] = buildWeek({ dates: ['2026-09-21'], mealPlan: 'standard', kcalTarget: null, proteinTarget: null });
    const breakfast = day.slots.find((slot) => slot.meal === 'breakfast');
    expect(breakfast?.recipe.id).toBe('yogurt-bowl');
    expect(breakfast?.portions).toBe(1);
    expect(portionLines(breakfast!)).toEqual([
      { name: 'Iaurt grecesc simplu, 0% grăsime', grams: 200 },
      { name: 'Nuci', grams: 20 },
      { name: 'Miere', grams: 10 },
      { name: 'Căpșuni', grams: 80 },
    ]);
    expect(portionWeight(breakfast!)).toBe(310);
  });

  it('porțiile sunt jumătăți și nu sar de 2,5', () => {
    const [day] = buildWeek({ dates: ['2026-09-21'], mealPlan: 'standard', kcalTarget: 4000, proteinTarget: 200 });
    for (const slot of day.slots) {
      expect(slot.portions % 0.5).toBe(0);
      expect(slot.portions).toBeGreaterThanOrEqual(0.5);
      expect(slot.portions).toBeLessThanOrEqual(2.5);
    }
  });
});
