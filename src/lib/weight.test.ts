import { describe, expect, it } from 'vitest';
import { addDays } from './date';
import { sevenDayAverage, weeklyRate } from './weight';

const series = (from: string, kgs: number[]) => kgs.map((kg, i) => ({ date: addDays(from, i), kg, trend: kg }));

describe('media pe 7 zile', () => {
  it('doar cântăririle din fereastra de 7 zile', () => {
    const pts = series('2026-09-24', [90, 82, 82.4, 82.2, 82.6, 82.0, 82.4, 82.2, 82.6]);
    expect(sevenDayAverage(pts, '2026-10-02')).toBe(82.34);
  });
  it('fără cântăriri: null', () => {
    expect(sevenDayAverage([], '2026-10-02')).toBeNull();
  });
});

describe('ritmul săptămânal', () => {
  it('o scădere constantă de 0,05 kg/zi înseamnă −0,35 kg pe săptămână', () => {
    const pts = series('2026-09-06', Array.from({ length: 28 }, (_, i) => 83 - i * 0.05));
    expect(weeklyRate(pts, '2026-10-03')).toBe(-0.35);
  });
  it('prea puține date: null', () => {
    expect(weeklyRate(series('2026-10-01', [82, 82.1, 82]), '2026-10-03')).toBeNull();
  });
});
