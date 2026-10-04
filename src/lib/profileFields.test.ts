import { describe, expect, it } from 'vitest';
import { parseBirthYear, parseHeight, parseKcalOverride } from './profileFields';

describe('câmpurile din Profil', () => {
  it('gol înseamnă necompletat', () => {
    expect(parseBirthYear(' ')).toEqual({ value: null });
    expect(parseHeight('')).toEqual({ value: null });
    expect(parseKcalOverride('')).toEqual({ value: null });
  });

  it('anul nașterii: întreg, între 1920 și acum 10 ani', () => {
    expect(parseBirthYear('1990', 2026)).toEqual({ value: 1990 });
    expect(parseBirthYear('2020', 2026).error).toBeDefined();
    expect(parseBirthYear('1990,5', 2026).error).toBeDefined();
    expect(parseBirthYear('abc', 2026).error).toBeDefined();
  });

  it('înălțimea acceptă virgulă, între 100 și 250 cm', () => {
    expect(parseHeight('182,5')).toEqual({ value: 182.5 });
    expect(parseHeight('90').error).toBeDefined();
  });

  it('ținta manuală: întreg între 800 și 8000', () => {
    expect(parseKcalOverride('2400')).toEqual({ value: 2400 });
    expect(parseKcalOverride('500').error).toBeDefined();
    expect(parseKcalOverride('2400,5').error).toBeDefined();
  });
});
