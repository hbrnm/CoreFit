import { describe, expect, it } from 'vitest';
import { parseThemePref, resolveTheme } from './theme';

describe('modul de culoare', () => {
  it('automat urmează telefonul, un mod fixat nu', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('o valoare necunoscută din stocare înseamnă automat', () => {
    expect(parseThemePref('dark')).toBe('dark');
    expect(parseThemePref('sepia')).toBe('system');
    expect(parseThemePref(null)).toBe('system');
  });
});
