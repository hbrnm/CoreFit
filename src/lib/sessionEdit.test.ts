import { describe, expect, it } from 'vitest';
import {
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
