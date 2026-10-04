import { describe, expect, it } from 'vitest';
import { entryLine, kcalLeftText, rescaleEntry } from './foodEdit';

const yogurt = { grams: 250, kcal: 420, protein: 32, carbs: 48, fat: 10, fiber: 4, sugar: 6, sodium: 300 };

describe('rescaleEntry', () => {
  it('recalculează proporțional cu gramajul nou', () => {
    expect(rescaleEntry(yogurt, 200)).toEqual({
      grams: 200,
      amount_text: '200 g',
      kcal: 336,
      protein: 25.6,
      carbs: 38.4,
      fat: 8,
      fiber: 3.2,
      sugar: 4.8,
      sodium: 240,
    });
  });

  it('nu poate recalcula fără gramajul vechi (porții, adăugare rapidă)', () => {
    expect(rescaleEntry({ ...yogurt, grams: null }, 200)).toBeNull();
  });

  it('respinge gramaje invalide', () => {
    expect(rescaleEntry(yogurt, 0)).toBeNull();
    expect(rescaleEntry(yogurt, Number.NaN)).toBeNull();
    expect(rescaleEntry(yogurt, 6000)).toBeNull();
  });

  it('sodiul lipsă la intrările vechi devine 0', () => {
    expect(rescaleEntry({ ...yogurt, sodium: undefined }, 500)?.sodium).toBe(0);
  });
});

describe('texte', () => {
  it('cât mai ai sau cu cât ai trecut de țintă', () => {
    expect(kcalLeftText(1840, 2400)).toBe('din 2.400 · mai ai 560');
    expect(kcalLeftText(2520, 2400)).toBe('din 2.400 · cu 120 peste');
    expect(kcalLeftText(2400, 2400)).toBe('din 2.400 · mai ai 0');
  });

  it('rândul din jurnal', () => {
    expect(entryLine({ name: 'Măr și migdale', amount_text: '1 măr, 20 g' })).toBe('Măr și migdale · 1 măr, 20 g');
    expect(entryLine({ name: 'Cafea', amount_text: '' })).toBe('Cafea');
  });
});
