import { describe, expect, it } from 'vitest';
import { BODYWEIGHT_MAX_SETS, DEFAULT_PROGRESSION, STALL_SESSIONS, suggestNextSets, type PastSet, type ProgressionRule } from './progression';

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

  it('greutatea corpului cu greutate adăugată, la plafon: nu adaugă greutate singură, doar semnalează', () => {
    const s = suggestNextSets(rule('double'), 'bodyweight', 5, 10, sets(10, 10, 10));
    expect(s.sets).toEqual([
      { weight: 10, reps: 10 },
      { weight: 10, reps: 10 },
    ]);
    expect(s.note).toMatch(/Adaugă greutate/);
    expect(s.setCount).toBeUndefined();
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

describe('serii cu greutăți diferite (piramidă, back-off)', () => {
  const pyramid = [
    { weight_kg: 100, reps: 8 },
    { weight_kg: 90, reps: 10 },
    { weight_kg: 80, reps: 12 },
  ];

  it('la dublă, fiecare serie progresează separat, la greutatea ei', () => {
    const s = suggestNextSets(rule('double'), 'reps', 8, 12, pyramid);
    expect(s.sets).toEqual([
      { weight: 100, reps: 9 },
      { weight: 90, reps: 11 },
      { weight: 82.5, reps: 8 },
    ]);
    expect(s.note).toMatch(/1 serie primește \+2\.5 kg/);
  });

  it('serii cu aceeași greutate urcă împreună, ca înainte', () => {
    const s = suggestNextSets(rule('double'), 'reps', 8, 12, sets(80, 12, 12, 11));
    expect(s.sets.every((x) => x.weight === 80)).toBe(true);
  });

  it('resetul Greyskull scade fiecare serie din greutatea ei', () => {
    const s = suggestNextSets(rule('greyskull'), 'reps', 5, 8, [
      { weight_kg: 100, reps: 5 },
      { weight_kg: 80, reps: 3 },
    ]);
    expect(s.sets.map((x) => x.weight)).toEqual([90, 72]);
  });
});

describe('deload la stagnare', () => {
  const stuck = sets(100, 5, 5, 4);

  it(`liniară: ${STALL_SESSIONS} sesiuni ratate la aceeași greutate → greutatea scade cu procentul de reset`, () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, stuck, { history: [stuck, stuck] });
    expect(s.sets).toEqual([
      { weight: 90, reps: 5 },
      { weight: 90, reps: 5 },
      { weight: 90, reps: 5 },
    ]);
    expect(s.note).toMatch(/deload/);
  });

  it('nu face deload cu mai puțin istoric decât pragul', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, stuck, { history: [stuck] });
    expect(s.sets[0].weight).toBe(100);
  });

  it('nu face deload dacă greutatea a fost alta într-una din sesiuni', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, stuck, { history: [stuck, sets(97.5, 5, 5, 5)] });
    expect(s.sets[0].weight).toBe(100);
  });

  it('nu face deload cât timp repetările totale cresc', () => {
    const s = suggestNextSets(rule('linear'), 'reps', 5, 5, sets(100, 5, 5, 4), {
      history: [sets(100, 5, 4, 4), sets(100, 4, 4, 4)],
    });
    expect(s.sets[0].weight).toBe(100);
  });

  it('dublă: stagnare sub plafon → deload', () => {
    const flat = sets(60, 10, 9, 8);
    const s = suggestNextSets(rule('double'), 'reps', 8, 12, flat, { history: [flat, flat] });
    expect(s.sets.every((x) => x.weight === 54 && x.reps === 8)).toBe(true);
  });

  it('nu se aplică exercițiilor fără greutate de redus', () => {
    const flat = sets(0, 6, 6);
    const s = suggestNextSets(rule('double'), 'bodyweight', 8, 12, flat, { history: [flat, flat] });
    expect(s.note).not.toMatch(/deload/);
  });

  it('Greyskull își păstrează propriul reset, fără deload la stagnare', () => {
    const s = suggestNextSets(rule('greyskull'), 'reps', 5, 8, sets(60, 5, 5, 6), {
      history: [sets(60, 5, 5, 6), sets(60, 5, 5, 6)],
    });
    expect(s.sets[0].weight).toBe(60);
  });
});

describe('greutatea corpului: serii în loc de repetări', () => {
  it('la plafon, fără greutate adăugată: o serie în plus, repetările de la minim', () => {
    const s = suggestNextSets(rule('double'), 'bodyweight', 5, 10, sets(0, 10, 10, 10));
    expect(s.setCount).toBe(4);
    expect(s.sets).toEqual(Array.from({ length: 4 }, () => ({ weight: 0, reps: 5 })));
    expect(s.note).toMatch(/o serie în plus/);
  });

  it('sub plafon păstrează numărul de serii câștigat', () => {
    const s = suggestNextSets(rule('double'), 'bodyweight', 5, 10, sets(0, 6, 6, 6, 5));
    expect(s.setCount).toBe(4);
    expect(s.sets.map((x) => x.reps)).toEqual([7, 7, 7, 6]);
  });

  it(`la ${BODYWEIGHT_MAX_SETS} serii se oprește și recomandă greutate sau o variantă mai grea`, () => {
    const full = sets(0, ...Array.from({ length: BODYWEIGHT_MAX_SETS }, () => 10));
    const s = suggestNextSets(rule('double'), 'bodyweight', 5, 10, full);
    expect(s.setCount).toBe(BODYWEIGHT_MAX_SETS);
    expect(s.note).toMatch(/Adaugă greutate/);
  });

  it('liniară și Greyskull ajung la același comportament pentru greutatea corpului', () => {
    const s = suggestNextSets(rule('linear'), 'bodyweight', 5, 10, sets(0, 10, 10));
    expect(s.setCount).toBe(3);
  });
});
