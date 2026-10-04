import { describe, expect, it } from 'vitest';
import {
  compactSets,
  previewRows,
  nextPendingSet,
  setNumber,
  setProgress,
  targetLabel,
  backfillLoggedAt,
  backfillWindow,
  heldSeconds,
  removeExerciseAt,
  restAfterSet,
  toggleSupersetWithNext,
} from './sessionEdit';
import type { DraftExercise } from './workoutOps';

const ex = (id: string, linkedToNext = false, rest_s = 90): DraftExercise => ({
  exercise_id: id,
  rest_s,
  sets: [],
  progressionNote: null,
  linkedToNext,
});

const ids = (list: DraftExercise[]) => list.map((e) => `${e.exercise_id}${e.linkedToNext ? '+' : ''}`).join(' ');

describe('superset din mers', () => {
  it('leagă un exercițiu de următorul și îl desface la a doua apăsare', () => {
    const once = toggleSupersetWithNext([ex('a'), ex('b'), ex('c')], 0);
    expect(ids(once)).toBe('a+ b c');
    expect(ids(toggleSupersetWithNext(once, 0))).toBe('a b c');
  });

  it('ultimul exercițiu nu are cu cine să fie legat', () => {
    expect(ids(toggleSupersetWithNext([ex('a'), ex('b')], 1))).toBe('a b');
  });

  it('nu modifică lista primită', () => {
    const list = [ex('a'), ex('b')];
    toggleSupersetWithNext(list, 0);
    expect(list[0].linkedToNext).toBe(false);
  });
});

describe('scoaterea unui exercițiu', () => {
  it('ultimul dintr-un superset: cel dinainte nu se leagă de exercițiul următor', () => {
    const list = [ex('a', true), ex('b'), ex('c')];
    expect(ids(removeExerciseAt(list, 1))).toBe('a c');
  });

  it('din mijlocul unui superset: grupul rămâne legat', () => {
    const list = [ex('a', true), ex('b', true), ex('c'), ex('d')];
    expect(ids(removeExerciseAt(list, 1))).toBe('a+ c d');
  });

  it('primul dintr-un superset: restul grupului rămâne', () => {
    const list = [ex('a', true), ex('b', true), ex('c')];
    expect(ids(removeExerciseAt(list, 0))).toBe('b+ c');
  });

  it('un exercițiu simplu nu atinge vecinii', () => {
    const list = [ex('a'), ex('b'), ex('c')];
    expect(ids(removeExerciseAt(list, 1))).toBe('a c');
  });
});

describe('pauza după o serie', () => {
  it('exercițiu simplu: pauza lui', () => {
    expect(restAfterSet([ex('a', false, 120)], 0)).toBe(120);
  });

  it('în mijlocul unui superset: fără pauză', () => {
    expect(restAfterSet([ex('a', true, 60), ex('b', false, 90)], 0)).toBeNull();
  });

  it('la finalul unei runde de superset: cea mai lungă pauză din grup', () => {
    const list = [ex('a', true, 180), ex('b', false, 60), ex('c', false, 30)];
    expect(restAfterSet(list, 1)).toBe(180);
    expect(restAfterSet(list, 2)).toBe(30);
  });

  it('o pauză lipsă (0) folosește valoarea implicită', () => {
    expect(restAfterSet([ex('a', false, 0)], 0)).toBe(90);
  });
});

describe('antrenament notat ulterior', () => {
  const now = new Date(2026, 9, 3, 12, 0);

  it('calculează începutul și sfârșitul în ora locală', () => {
    const w = backfillWindow({ date: '2026-10-01', time: '18:30', minutes: 75 }, now);
    expect(w).toEqual({
      startedAt: new Date(2026, 9, 1, 18, 30).toISOString(),
      endedAt: new Date(2026, 9, 1, 19, 45).toISOString(),
    });
  });

  it('refuză un antrenament care s-ar termina în viitor', () => {
    expect(typeof backfillWindow({ date: '2026-10-03', time: '11:30', minutes: 60 }, now)).toBe('string');
  });

  it('refuză durate absurde și date invalide', () => {
    expect(typeof backfillWindow({ date: '2026-10-01', time: '18:00', minutes: 0 }, now)).toBe('string');
    expect(typeof backfillWindow({ date: '2026-10-01', time: '18:00', minutes: 601 }, now)).toBe('string');
    expect(typeof backfillWindow({ date: '2026-02-30', time: '18:00', minutes: 60 }, now)).toBe('string');
    expect(typeof backfillWindow({ date: '', time: '18:00', minutes: 60 }, now)).toBe('string');
  });

  it('seriile primesc momente în ordine, după începutul antrenamentului', () => {
    const start = '2026-10-01T15:00:00.000Z';
    expect(backfillLoggedAt(start, 0)).toBe('2026-10-01T15:00:01.000Z');
    expect(backfillLoggedAt(start, 4)).toBe('2026-10-01T15:00:05.000Z');
  });
});

describe('cronometrul de lucru', () => {
  it('rotunjește la secunde și nu dă niciodată 0', () => {
    expect(heldSeconds(0, 45_400)).toBe(45);
    expect(heldSeconds(0, 200)).toBe(1);
  });
});

describe('seria următoare și progresul', () => {
  const set = (done: boolean, kind: 'warmup' | 'work' | 'drop' | 'failure' = 'work') => ({ key: Math.random().toString(), kind, weight: '80', reps: '8', effort: '', done, log_id: null });
  const withSets = (sets: ReturnType<typeof set>[]) => ({ ...ex('a'), sets, repRange: { min: 6, max: 8 } });

  it('prima serie nebifată, în ordinea exercițiilor', () => {
    const list = [withSets([set(true), set(true)]), withSets([set(true), set(false), set(false)])];
    expect(nextPendingSet(list)).toEqual({ exIndex: 1, setIndex: 1 });
    expect(nextPendingSet([withSets([set(true)])])).toBeNull();
  });

  it('progresul numără toate seriile, bifate din total', () => {
    expect(setProgress([withSets([set(true), set(false)]), withSets([set(true)])])).toEqual({ done: 2, total: 3 });
  });

  it('numărul seriei sare peste încălzire și drop set', () => {
    const e = withSets([set(true, 'warmup'), set(true), set(false, 'failure'), set(false, 'drop')]);
    expect([0, 1, 2, 3].map((i) => setNumber(e, i))).toEqual([null, 1, 2, null]);
  });

  it('ținta: „3 × 6–8 · pauză 2:30”, fără încălziri', () => {
    const e = withSets([set(false, 'warmup'), set(false), set(false), set(false)]);
    expect(targetLabel(e, 150)).toBe('3 × 6–8 · pauză 2:30');
    expect(targetLabel({ ...e, repRange: undefined }, 90)).toBe('3 serii · pauză 1:30');
  });
});

describe('compactSets', () => {
  it('adună seriile identice consecutive', () => {
    expect(compactSets(['80 × 8', '80 × 8', '80 × 8', '75 × 10'])).toBe('3 serii de 80 × 8, 75 × 10');
  });
  it('lasă neschimbate seriile diferite și nu adună peste o întrerupere', () => {
    expect(compactSets(['80 × 8', '75 × 10', '80 × 8'])).toBe('80 × 8, 75 × 10, 80 × 8');
    expect(compactSets([])).toBe('');
  });
});

describe('previewRows', () => {
  const set = (weight: string, kind: DraftExercise['sets'][number]['kind'] = 'work') => ({ key: weight + kind, kind, weight, reps: '8', effort: '', done: false, log_id: null });
  const names: Record<string, string> = { bench: 'Împins', row: 'Ramat', pull: 'Tracțiuni', dips: 'Flotări la paralele' };
  const nameOf = (id: string) => names[id];

  it('un rând pe exercițiu, cu greutatea precompletată', () => {
    const bench = { ...ex('bench'), sets: [set('60', 'warmup'), set('82,5'), set('82,5'), set('82,5')], repRange: { min: 6, max: 8 } };
    expect(previewRows([bench], nameOf)).toEqual([{ title: 'Împins', detail: '3 × 6–8 · 82,5 kg' }]);
  });

  it('fără greutate (greutatea corpului) și cu repetări fixe', () => {
    const row = { ...ex('row'), sets: [set(''), set('')], repRange: { min: 5, max: 5 } };
    expect(previewRows([row], nameOf)).toEqual([{ title: 'Ramat', detail: '2 × 5' }]);
  });

  it('supersetul e un singur rând, cu rundele', () => {
    const pull = { ...ex('pull', true), sets: [set(''), set(''), set('')] };
    const dips = { ...ex('dips'), sets: [set(''), set(''), set('')] };
    expect(previewRows([pull, dips], nameOf)).toEqual([{ title: 'Tracțiuni + Flotări la paralele', detail: 'superset · 3 runde' }]);
  });
});
