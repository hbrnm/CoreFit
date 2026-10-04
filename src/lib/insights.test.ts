import { describe, expect, it } from 'vitest';
import { kcalByDay, kcalInsight, lastDays, strengthInsight, strengthPerWeek, weightChange } from './insights';

describe('zilele din interval', () => {
  it('se termină azi și sunt în ordine', () => {
    expect(lastDays('2026-10-03', 3)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });
});

describe('caloriile pe zi', () => {
  it('adună alimentele din aceeași zi și pune 0 unde nu e nimic', () => {
    const entries = [
      { log_date: '2026-10-01', kcal: 400 },
      { log_date: '2026-10-01', kcal: 250.4 },
      { log_date: '2026-10-03', kcal: 1840 },
    ];
    expect(kcalByDay(entries, lastDays('2026-10-03', 3))).toEqual([650, 0, 1840]);
  });
});

describe('tendința caloriilor', () => {
  const four = (k: number) => Array.from({ length: 28 }, () => k);

  it('sub țintă: media și diferența, în cuvinte', () => {
    const r = kcalInsight(four(2250), 2400)!;
    expect(r.avg).toBe(2250);
    expect(r.diff).toBe(-150);
    expect(r.text).toMatch(/^În ultimele 4 săptămâni ai mâncat în medie 2.?250 kcal pe zi, cu 150 sub țintă\.$/);
  });

  it('peste țintă și „cât ținta” la mai puțin de 50 kcal diferență', () => {
    expect(kcalInsight(four(2600), 2400)!.text).toContain('cu 200 peste țintă');
    expect(kcalInsight(four(2420), 2400)!.text).toContain(', cât ținta.');
  });

  it('fără țintă: doar media', () => {
    expect(kcalInsight(four(2000), null)!.text).toMatch(/kcal pe zi\.$/);
  });

  it('zilele aproape goale nu trag media în jos și sub 7 zile notate nu spune nimic', () => {
    const series = [...Array.from({ length: 7 }, () => 2000), ...Array.from({ length: 21 }, () => 120)];
    expect(kcalInsight(series, null)!.avg).toBe(2000);
    expect(kcalInsight([2000, 2000, 2000, 0, 0, 0, 0, 0], null)).toBeNull();
  });
});

describe('antrenamentele de forță pe săptămână', () => {
  const s = (day: string, kind: 'strength' | 'cardio' = 'strength', ended = true) => ({
    kind,
    started_at: `${day}T18:00:00.000Z`,
    ended_at: ended ? `${day}T19:00:00.000Z` : null,
    deleted: false,
  });

  it('numără doar forța terminată, pe săptămâni începând lunea; cea curentă e ultima', () => {
    // sâmbătă 3 oct. 2026; săptămâna curentă începe luni 28 sept.
    const sessions = [s('2026-09-28'), s('2026-10-01'), s('2026-10-02', 'cardio'), s('2026-09-22'), s('2026-09-23', 'strength', false)];
    expect(strengthPerWeek(sessions, '2026-10-03', 'monday', 3)).toEqual([0, 1, 2]);
  });

  it('seria: săptămâni încheiate la rând peste țintă, fără săptămâna curentă', () => {
    const r = strengthInsight([1, 3, 2, 3, 0], 2)!;
    expect(r.streak).toBe(3);
    expect(r.text).toBe('Ai ținut ritmul: cel puțin 2 antrenamente de forță pe săptămână, 3 săptămâni la rând.');
  });

  it('fără serie: media pe săptămâni', () => {
    expect(strengthInsight([2, 1, 0, 1, 3], 2)!.text).toBe('În ultimele 4 săptămâni ai făcut în medie 1 antrenament de forță pe săptămână.');
  });

  it('nimic de spus fără antrenamente încheiate', () => {
    expect(strengthInsight([0, 0, 0, 4], 2)).toBeNull();
  });
});

describe('variația greutății', () => {
  it('din trend, nu din cântăriri, cu semnul minus tipografic', () => {
    const points = [
      { date: '2026-09-03', kg: 84, trend: 83.0 },
      { date: '2026-09-20', kg: 82, trend: 82.7 },
      { date: '2026-10-03', kg: 82.9, trend: 82.4 },
    ];
    const r = weightChange(points, '2026-09-03', '2026-10-03')!;
    expect(r.delta).toBe(-0.6);
    expect(r.text).toBe('−0,6 kg în 30 de zile');
  });

  it('un singur punct nu e o variație', () => {
    expect(weightChange([{ date: '2026-10-03', kg: 82, trend: 82 }], '2026-09-03', '2026-10-03')).toBeNull();
  });
});
