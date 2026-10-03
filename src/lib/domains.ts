import type { Tab } from '../context';

/*
 * Culorile din JS (grafice, cronometre, hărți musculare) ca valori CSS care urmează tema:
 * `rgb(var(--workouts))` e portocaliu închis în modul deschis și portocaliu deschis în cel închis.
 * Se folosesc în `style`, nu în atributele SVG, unde var() nu merge peste tot.
 */
export type Tone =
  | 'brand' | 'workouts' | 'health' | 'nutrition' | 'water' | 'body'
  | 'success' | 'warning' | 'danger' | 'fg' | 'subtle' | 'surface' | 'line';

const VAR: Record<Tone, string> = {
  brand: 'brand-fg',
  workouts: 'workouts',
  health: 'health',
  nutrition: 'nutrition',
  water: 'water',
  body: 'body',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  fg: 'fg',
  subtle: 'subtle',
  surface: 'surface',
  line: 'line',
};

/** Culoarea unui ton, opțional transparentă (0..1). */
export function tone(t: Tone, alpha = 1): string {
  return alpha >= 1 ? `rgb(var(--${VAR[t]}))` : `rgb(var(--${VAR[t]}) / ${alpha})`;
}

interface DomainStyle {
  label: string;
  /** bară subțire de accent sub antet */
  bar: string;
  /** text și iconițe în culoarea secțiunii */
  text: string;
  /** butonul principal și opțiunea selectată: aceeași culoare de brand în toată aplicația */
  solid: string;
  /** culoarea checkbox-urilor */
  accent: string;
  /** marginea colorată a unui panou */
  edge: string;
}

const SOLID = 'bg-brand text-on-brand active:bg-brand/90';

export const DOMAIN: Record<Tab, DomainStyle> = {
  home: { label: 'Acasă', bar: 'bg-brand', text: 'text-brand-fg', solid: SOLID, accent: 'accent-brand', edge: 'border-l-brand' },
  workouts: { label: 'Antrenament', bar: 'bg-workouts', text: 'text-workouts', solid: SOLID, accent: 'accent-brand', edge: 'border-l-workouts' },
  health: { label: 'Sănătate', bar: 'bg-health', text: 'text-health', solid: SOLID, accent: 'accent-brand', edge: 'border-l-health' },
  nutrition: { label: 'Nutriție', bar: 'bg-nutrition', text: 'text-nutrition', solid: SOLID, accent: 'accent-brand', edge: 'border-l-nutrition' },
  profile: { label: 'Profil', bar: 'bg-brand', text: 'text-brand-fg', solid: SOLID, accent: 'accent-brand', edge: 'border-l-brand' },
};
