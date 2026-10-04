import { describe, expect, it } from 'vitest';
import type { MuscleFatigue } from './fatigue';
import { bestSeries, bucketFor, changeSentence, fatigueByGroup, gridLines, rangeFrom, rateText } from './progress';

const at = (date: string, h = 18) => new Date(`${date}T${String(h).padStart(2, '0')}:00:00`).toISOString();
const log = (date: string, weight_kg: number, reps: number, exercise_id = 'bench') => ({ exercise_id, weight_kg, reps, logged_at: at(date) });

describe('intervale', () => {
  it('7Z înseamnă azi și 6 zile înainte; 1 an, 365 de zile', () => {
    expect(rangeFrom('2026-10-04', '7z')).toBe('2026-09-28');
    expect(rangeFrom('2026-10-04', '1an')).toBe('2025-10-05');
  });
  it('zile pe intervale scurte, săptămâni pe cele lungi', () => {
    expect(bucketFor('7z')).toBe('day');
    expect(bucketFor('30z')).toBe('day');
    expect(bucketFor('90z')).toBe('week');
  });
});

describe('bestSeries', () => {
  const logs = [
    log('2026-09-28', 80, 8), // lun: 101,3
    log('2026-09-30', 82.5, 6), // mie: 99
    log('2026-10-02', 82.5, 8), // vin: 104,5
    log('2026-10-02', 60, 20), // peste 12 repetări: nu contează pentru 1RM
    log('2026-10-02', 100, 5, 'squat'),
  ];

  it('cel mai bun 1RM estimat pe zi, doar pentru exercițiul cerut', () => {
    expect(bestSeries(logs, 'bench', 'reps', '2026-09-28', '2026-10-04', 'day', 'monday')).toEqual([
      { date: '2026-09-28', value: 101.3 },
      { date: '2026-09-30', value: 99 },
      { date: '2026-10-02', value: 104.5 },
    ]);
  });

  it('pe săptămână, cel mai bun din săptămână, cu data primei zile', () => {
    expect(bestSeries(logs, 'bench', 'reps', '2026-09-01', '2026-10-04', 'week', 'monday')).toEqual([{ date: '2026-09-28', value: 104.5 }]);
  });

  it('respectă intervalul și, fără greutate, folosește repetările', () => {
    expect(bestSeries(logs, 'bench', 'reps', '2026-10-01', '2026-10-04', 'day', 'monday')).toHaveLength(1);
    expect(bestSeries([log('2026-10-01', 0, 12, 'pull')], 'pull', 'bodyweight', '2026-10-01', '2026-10-04', 'day', 'monday')).toEqual([
      { date: '2026-10-01', value: 12 },
    ]);
  });
});

describe('propoziții', () => {
  it('creștere pe săptămâni, cu ritmul', () => {
    expect(changeSentence([{ date: '2026-08-10', value: 90 }, { date: '2026-10-05', value: 97.5 }], 'kg')).toBe(
      'Ai crescut 7,5 kg în 8 săptămâni, cam 0,9 kg pe săptămână.',
    );
  });
  it('scădere pe câteva zile, fără ritm săptămânal', () => {
    expect(changeSentence([{ date: '2026-10-01', value: 100 }, { date: '2026-10-04', value: 97.5 }], 'kg')).toBe('Ai scăzut 2,5 kg în 3 zile.');
  });
  it('stabil și prea puține puncte', () => {
    expect(changeSentence([{ date: '2026-09-01', value: 100 }, { date: '2026-10-01', value: 100.2 }], 'kg')).toBe('Stabil în 4 săptămâni: 100,2 kg.');
    expect(changeSentence([{ date: '2026-10-01', value: 100 }], 'kg')).toBeNull();
  });
  it('ritmul greutății', () => {
    expect(rateText(-0.31)).toBe('−0,31 kg pe săptămână');
    expect(rateText(0.2)).toBe('+0,2 kg pe săptămână');
    expect(rateText(0.01)).toBe('stabil');
  });
});

describe('oboseala pe grupe', () => {
  const f = (muscle: MuscleFatigue['muscle'], value: number): MuscleFatigue => ({ muscle, label: '', value, level: 'fresh', hoursToFresh: 0 });
  it('picioarele iau cea mai obosită componentă; ordinea, de la obosit la odihnit', () => {
    const rows = fatigueByGroup([f('chest', 0.8), f('glutes', 0.3), f('quads', 0.1), f('core', 0)]);
    expect(rows[0]).toEqual({ label: 'Piept', value: 0.8, level: 'tired' });
    expect(rows[1]).toEqual({ label: 'Picioare', value: 0.3, level: 'partial' });
    expect(rows).toHaveLength(7);
  });
});

describe('gridLines', () => {
  it('valori rotunde între minim și maxim', () => {
    expect(gridLines(89, 98)).toEqual([90, 95]);
    expect(gridLines(81.2, 83.1)).toEqual([82, 83]);
    expect(gridLines(1800, 2600)).toEqual([2000, 2500]);
    expect(gridLines(5, 5)).toEqual([5]);
  });
});
