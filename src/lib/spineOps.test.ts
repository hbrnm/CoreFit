import { describe, expect, it } from 'vitest';
import { checklistStreak, toggled } from './spineOps';

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
