import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_COLOR } from '../src/lib/theme.ts';

const css = readFileSync('src/index.css', 'utf8');

/*
 * Contrastul temei, citit direct din src/index.css (din scripts/, ca build-setup-sql.test.mjs:
 * Vitest nu încarcă fișierele CSS): dacă cineva schimbă o culoare,
 * testul spune exact ce pereche nu mai trece WCAG AA.
 */
function palette(selector) {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*(\d+) (\d+) (\d+);/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = { deschis: palette(':root {'), închis: palette(":root[data-theme='dark'] {") };
const BACKGROUNDS = ['canvas', 'surface', 'raised'];
/** text pe fundalurile neutre: WCAG AA pentru text normal */
const TEXT = ['fg', 'muted', 'subtle', 'brand-fg', 'danger', 'success', 'warning', 'workouts', 'health', 'nutrition'];
/** fundaluri pline cu text on-brand (butoane, bife, insigne) */
const SOLIDS = ['brand', 'danger-solid', 'success-solid', 'warning-solid'];

describe.each(Object.entries(THEMES))('tema %s', (_, p) => {
  it('are toate culorile', () => {
    for (const k of [...BACKGROUNDS, ...TEXT, ...SOLIDS, 'on-brand', 'line', 'line-strong']) expect(p[k], k).toBeDefined();
  });

  it.each(TEXT.flatMap((t) => BACKGROUNDS.map((bg) => [t, bg])))('%s pe %s: cel puțin 4,5:1', (t, bg) => {
    expect(contrast(p[t], p[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SOLIDS)('text on-brand pe %s: cel puțin 4,5:1', (s) => {
    expect(contrast(p['on-brand'], p[s])).toBeGreaterThanOrEqual(4.5);
  });

  it('marginea câmpurilor de bifat se vede: cel puțin 3:1 față de card', () => {
    expect(contrast(p['line-strong'], p.surface)).toBeGreaterThanOrEqual(3);
  });
});

it('modul închis e același și din setarea telefonului, și fixat din Profil', () => {
  expect(palette(":root:not([data-theme='light']) {")).toEqual(THEMES.închis);
});

it('bara de sistem are culoarea antetului', () => {
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  expect(THEME_COLOR.light).toBe(hex(THEMES.deschis.surface));
  expect(THEME_COLOR.dark).toBe(hex(THEMES.închis.surface));
});
