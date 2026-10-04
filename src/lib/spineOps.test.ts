import { describe, expect, it } from 'vitest';
import { AXIAL_HEAVY, axialWarning, checklistStreak, HIGH_PAIN, movementLibrary, toggled } from './spineOps';
import { PROGRAMS, SPINE_ZONES } from '../data/health';
import { builtinExercise } from '../data/exercises';
import type { LocalPainLog } from './db';

describe('checklistul coloanei', () => {
  it('apăsarea bifează și debifează; id-urile necunoscute dispar', () => {
    expect(toggled([], 'walk')).toEqual(['walk']);
    expect(toggled(['walk', 'chin-tuck'], 'walk')).toEqual(['chin-tuck']);
    expect(toggled(['vechi', 'walk'], 'chin-tuck')).toEqual(['walk', 'chin-tuck']);
  });

  it('seria: zile la rând cu cel puțin 3 bife; azi gol nu rupe seria', () => {
    const rows = [
      { log_date: '2026-10-01', done: ['a', 'b', 'c'] },
      { log_date: '2026-10-02', done: ['a', 'b', 'c', 'd'] },
      { log_date: '2026-09-30', done: ['a'] },
    ];
    expect(checklistStreak(rows, '2026-10-03')).toBe(2);
    expect(checklistStreak([...rows, { log_date: '2026-10-03', done: ['a', 'b', 'c'] }], '2026-10-03')).toBe(3);
    expect(checklistStreak(rows, '2026-10-05')).toBe(0);
  });
});

describe('axialWarning', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  const log = (region: LocalPainLog['region'], score: number, hoursAgo: number, deleted = false) => ({
    region,
    score,
    logged_at: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
    deleted,
  });

  it('avertizează la genuflexiuni cu durere lombară mare, recentă', () => {
    expect(axialWarning(['back-squat', 'leg-curl'], [log('lower_back', 7, 3)], now)).toEqual({
      zone: 'lower_back',
      score: 7,
      exerciseIds: ['back-squat'],
    });
  });

  it('contează ultima notare din zonă: dacă durerea a scăzut, nu mai avertizează', () => {
    expect(axialWarning(['deadlift'], [log('lower_back', 8, 20), log('lower_back', 3, 2)], now)).toBeNull();
  });

  it('ignoră notările vechi, șterse, zonele din afara coloanei și exercițiile neaxiale', () => {
    expect(axialWarning(['deadlift'], [log('lower_back', 9, 60)], now)).toBeNull();
    expect(axialWarning(['deadlift'], [log('lower_back', 9, 1, true)], now)).toBeNull();
    expect(axialWarning(['deadlift'], [log('knee', 9, 1)], now)).toBeNull();
    expect(axialWarning(['leg-press', 'lat-pulldown'], [log('lower_back', 9, 1)], now)).toBeNull();
  });

  it('raportează zona cu durerea cea mai mare, cu pragul inclus', () => {
    const w = axialWarning(['overhead-press'], [log('neck', HIGH_PAIN, 1), log('thoracic', 8, 1)], now);
    expect(w?.zone).toBe('thoracic');
    expect(axialWarning(['overhead-press'], [log('neck', HIGH_PAIN, 1)], now)?.score).toBe(HIGH_PAIN);
    expect(axialWarning(['overhead-press'], [log('neck', HIGH_PAIN - 1, 1)], now)).toBeNull();
  });

  it('toate exercițiile axiale există în catalog', () => {
    for (const id of AXIAL_HEAVY) expect(builtinExercise(id), id).toBeDefined();
  });
});

describe('movementLibrary', () => {
  it('grupează mișcările pe zonele coloanei, fără dubluri', () => {
    const lib = movementLibrary(PROGRAMS, SPINE_ZONES);
    expect([...lib.keys()]).toEqual(SPINE_ZONES);
    for (const moves of lib.values()) {
      const ids = moves.map((m) => m.exercise.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const zone of SPINE_ZONES) expect(lib.get(zone)!.length, zone).toBeGreaterThan(0);
    // extensia toracală stă la toracal, deși e în programul pentru gât
    expect(lib.get('thoracic')!.map((m) => m.exercise.id)).toContain('thoracic-ext');
    expect(lib.get('neck')!.map((m) => m.exercise.id)).not.toContain('thoracic-ext');
  });

  it('o mișcare comună mai multor programe le păstrează pe toate', () => {
    const ex = { id: 'x', name: 'X', how: '', kind: 'reps' as const, sets: 1, restS: 0 };
    const p = (id: string) => ({ ...PROGRAMS[0], id, region: 'neck' as const, exercises: [ex] });
    expect(movementLibrary([p('a'), p('b')], ['neck']).get('neck')).toEqual([{ exercise: ex, programIds: ['a', 'b'] }]);
  });
});
