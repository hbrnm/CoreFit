import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESSION, suggestNextSets, type PastSet, type ProgressionRule } from './progression';

const rule = (kind: ProgressionRule['kind'], over: Partial<ProgressionRule> = {}): ProgressionRule => ({
  ...DEFAULT_PROGRESSION,
  kind,
  ...over,
});

const sets = (weight: number, ...reps: number[]): PastSet[] => reps.map((r) => ({ weight_kg: weight, reps: r }));

describe('fără progresie', () => {
  it('repetă exact ultima sesiune, fără notă', () => {
    const s = suggestNextSets(rule('none'), 'reps', 5, 5, sets(100, 5, 5, 4));
    expect(s.sets).toEqual([
      { weight: 100, reps: 5 },
      { weight: 100, reps: 5 },
      { weight: 100, reps: 4 },
    ]);
    expect(s.note).toBe('');
  });

  it('fără istoric nu sugerează nimic, indiferent de regulă', () => {
    for (const kind of ['none', 'linear', 'double', 'greyskull'] as const) {
      expect(suggestNextSets(rule(kind), 'reps', 5, 8, []).sets).toEqual([]);
    }
  });
});

describe('liniară', () => {
  it('toate seriile la țintă: +increment și repetările revin la țintă', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, sets(100, 5, 5, 6));
    expect(s.sets).toEqual([
      { weight: 102.5, reps: 5 },
      { weight: 102.5, reps: 5 },
      { weight: 102.5, reps: 5 },
    ]);
  });

  it('o serie ratată: aceeași greutate', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, sets(100, 5, 5, 4));
    expect(s.sets.every((x) => x.weight === 100 && x.reps === 5)).toBe(true);
  });

  it('folosește incrementul rutinei și rotunjește la 2 zecimale', () => {
    const s = suggestNextSets(rule('linear', { incrementKg: 1.25 }), 'reps', 5, 5, sets(41.25, 5, 5));
    expect(s.sets[0].weight).toBe(42.5);
  });

  it('păstrează greutatea fiecărei serii când acestea diferă', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, [
      { weight_kg: 100, reps: 5 },
      { weight_kg: 90, reps: 5 },
    ]);
    expect(s.sets.map((x) => x.weight)).toEqual([102.5, 92.5]);
  });

  it('acceptă rep_min și rep_max inversate', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 8, 5, sets(100, 5, 5));
    expect(s.sets[0]).toEqual({ weight: 102.5, reps: 5 });
  });
});

describe('dublă', () => {
  it('sub plafon: aceeași greutate, +1 repetare pe fiecare serie, fără să treacă de plafon', () => {
    const s = suggestNextSets(rule('double'), 'reps', 8, 12, sets(20, 12, 10, 9));
    expect(s.sets).toEqual([
      { weight: 20, reps: 12 },
      { weight: 20, reps: 11 },
      { weight: 20, reps: 10 },
    ]);
  });

  it('toate seriile la plafon: +increment, repetările reîncep de la minim', () => {
    const s = suggestNextSets(rule('double'), 'reps', 8, 12, sets(20, 12, 12, 13));
    expect(s.sets).toEqual([
      { weight: 22.5, reps: 8 },
      { weight: 22.5, reps: 8 },
      { weight: 22.5, reps: 8 },
    ]);
  });

  it('greutatea corpului la plafon: nu adaugă greutate singură, doar semnalează', () => {
    const s = suggestNextSets(rule('double'), 'bodyweight', 5, 10, sets(0, 10, 10));
    expect(s.sets).toEqual([
      { weight: 0, reps: 10 },
      { weight: 0, reps: 10 },
    ]);
    expect(s.note).toMatch(/Adaugă greutate/);
  });

  it('exercițiu cronometrat: progresează în secunde', () => {
    const s = suggestNextSets(rule('double'), 'duration', 30, 60, sets(0, 45, 40));
    expect(s.sets.map((x) => x.reps)).toEqual([46, 41]);
    expect(s.note).toMatch(/secundă/);
  });
});

describe('Greyskull', () => {
  const r = rule('greyskull');

  it('AMRAP în interval: aceeași greutate', () => {
    const s = suggestNextSets(r, 'reps', 5, 8, sets(60, 5, 5, 6));
    expect(s.sets.every((x) => x.weight === 60 && x.reps === 5)).toBe(true);
  });

  it('AMRAP la plafon: +increment', () => {
    const s = suggestNextSets(r, 'reps', 5, 8, sets(60, 5, 5, 8));
    expect(s.sets.every((x) => x.weight === 62.5)).toBe(true);
  });

  it('AMRAP cu 5+ peste plafon: salt dublu', () => {
    const s = suggestNextSets(r, 'reps', 5, 8, sets(60, 5, 5, 13));
    expect(s.sets.every((x) => x.weight === 65)).toBe(true);
  });

  it('AMRAP sub minim: greutatea scade cu procentul de reset', () => {
    const s = suggestNextSets(r, 'reps', 5, 8, sets(60, 5, 5, 3));
    expect(s.sets).toEqual([
      { weight: 54, reps: 5 },
      { weight: 54, reps: 5 },
      { weight: 54, reps: 5 },
    ]);
  });

  it('se uită doar la ultima serie (AMRAP), nu la celelalte', () => {
    const s = suggestNextSets(r, 'reps', 5, 8, sets(60, 3, 3, 8));
    expect(s.sets[0].weight).toBe(62.5);
  });
});

describe('liniară și Greyskull fără greutate de crescut', () => {
  it('cad pe progresia dublă la exerciții cu greutatea corpului', () => {
    for (const kind of ['linear', 'greyskull'] as const) {
      const s = suggestNextSets(rule(kind), 'bodyweight', 5, 10, sets(0, 6, 5));
      expect(s.sets).toEqual([
        { weight: 0, reps: 7 },
        { weight: 0, reps: 6 },
      ]);
    }
  });

  it('cad pe progresia dublă la exerciții cronometrate', () => {
    const s = suggestNextSets(rule('greyskull'), 'duration', 30, 60, sets(0, 60, 60));
    expect(s.sets.every((x) => x.weight === 0 && x.reps === 60)).toBe(true);
  });
});
