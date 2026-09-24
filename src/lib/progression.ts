import type { ExerciseKind } from '../data/exercises';

/*
 * Progresie automată: sugerează greutatea și repetările pentru sesiunea următoare,
 * pe baza ultimei sesiuni (fără sesiunile de deload — acelea nu avansează nimic).
 *
 * Patru reguli, inspirate din practici uzuale de antrenament:
 *  - none:      fără sugestie; se repetă exact ce a fost ultima dată (comportamentul de bază).
 *  - linear:    țintă fixă de repetări (rep_min). Reușești la toate seriile → greutate + increment.
 *               Nu reușești → aceeași greutate. Gândit pentru mișcări de bază (genuflexiune, deadlift).
 *  - double:    interval de repetări (rep_min..rep_max). Crești repetările serie cu serie; când toate
 *               seriile ating rep_max, greutatea crește și repetările reîncep de la rep_min.
 *  - greyskull: ultima serie e AMRAP (repetări maxime posibile). Depășești rep_max cu mult → salt dublu.
 *               Atingi rep_max → increment normal. Sub rep_min → greutatea scade cu reset_pct.
 *
 * Pentru exerciții cu greutatea corpului sau cronometrate, "linear" și "greyskull" nu au sens
 * (nu există o greutate de crescut în mod fiabil), deci se comportă ca "double": progresează pe
 * repetări (sau secunde), iar la pragul de sus doar semnalează, fără să adauge greutate automat.
 */

export type ProgressionKind = 'none' | 'linear' | 'double' | 'greyskull';

export const PROGRESSION_LABELS: Record<ProgressionKind, string> = {
  none: 'Fără',
  linear: 'Liniară',
  double: 'Dublă',
  greyskull: 'Greyskull',
};

export interface ProgressionRule {
  kind: ProgressionKind;
  /** kg adăugați la un succes (liniară, dublă, greyskull) */
  incrementKg: number;
  /** procent scăzut din greutate la un eșec sub minim (doar greyskull) */
  resetPct: number;
}

export const DEFAULT_PROGRESSION: ProgressionRule = { kind: 'none', incrementKg: 2.5, resetPct: 0.1 };

/** Prag pentru "salt dublu" la Greyskull: cu cât AMRAP trebuie să depășească rep_max. */
const GREYSKULL_BIG_BEAT = 5;

export interface PastSet {
  weight_kg: number;
  reps: number;
}

export interface SuggestedSet {
  weight: number;
  reps: number;
}

export interface Suggestion {
  sets: SuggestedSet[];
  /** explicație scurtă, afișată o singură dată pentru tot exercițiul */
  note: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function doubleProgression(
  kind: ExerciseKind,
  repMin: number,
  repMax: number,
  incrementKg: number,
  previous: PastSet[],
): Suggestion {
  const allAtCeiling = previous.every((s) => s.reps >= repMax);
  const unit = kind === 'duration' ? 'secunde' : 'repetări';

  if (allAtCeiling) {
    if (kind === 'reps') {
      return {
        sets: previous.map((s) => ({ weight: round2(s.weight_kg + incrementKg), reps: repMin })),
        note: `Ai atins ${repMax} ${unit} la toate seriile: +${round2(incrementKg)} kg, repetările reîncep de la ${repMin}.`,
      };
    }
    return {
      sets: previous.map((s) => ({ weight: s.weight_kg, reps: repMax })),
      note:
        kind === 'duration'
          ? `Ai atins ${repMax} ${unit} la toate seriile. Adaugă greutate sau alege un exercițiu mai greu.`
          : `Ai atins ${repMax} ${unit} la toate seriile. Adaugă greutate sau alege o variantă mai grea.`,
    };
  }

  return {
    sets: previous.map((s) => ({ weight: s.weight_kg, reps: Math.min(repMax, s.reps + 1) })),
    note: `Aceeași greutate, o ${kind === 'duration' ? 'secundă' : 'repetare'} în plus față de ultima dată, unde a fost posibil.`,
  };
}

function linearProgression(repMin: number, incrementKg: number, previous: PastSet[]): Suggestion {
  const success = previous.every((s) => s.reps >= repMin);
  if (success) {
    return {
      sets: previous.map((s) => ({ weight: round2(s.weight_kg + incrementKg), reps: repMin })),
      note: `Ai reușit toate seriile la ${repMin} repetări: +${round2(incrementKg)} kg.`,
    };
  }
  return {
    sets: previous.map((s) => ({ weight: s.weight_kg, reps: repMin })),
    note: 'Aceeași greutate: nu ai reușit toate seriile la ținta de repetări ultima dată.',
  };
}

function greyskullProgression(
  repMin: number,
  repMax: number,
  incrementKg: number,
  resetPct: number,
  previous: PastSet[],
): Suggestion {
  const amrap = previous[previous.length - 1];
  let delta = 0;
  let note: string;

  if (amrap.reps >= repMax + GREYSKULL_BIG_BEAT) {
    delta = incrementKg * 2;
    note = `Serie AMRAP cu ${amrap.reps} repetări, mult peste țintă: salt dublu, +${round2(delta)} kg.`;
  } else if (amrap.reps >= repMax) {
    delta = incrementKg;
    note = `Serie AMRAP cu ${amrap.reps} repetări, peste țintă: +${round2(delta)} kg.`;
  } else if (amrap.reps < repMin) {
    const newWeight = round2(amrap.weight_kg * (1 - resetPct));
    return {
      sets: previous.map(() => ({ weight: newWeight, reps: repMin })),
      note: `Serie AMRAP cu doar ${amrap.reps} repetări, sub minim: greutate redusă cu ${Math.round(resetPct * 100)}%.`,
    };
  } else {
    note = `Serie AMRAP cu ${amrap.reps} repetări, în interval: aceeași greutate.`;
  }

  return {
    sets: previous.map((s) => ({ weight: round2(s.weight_kg + delta), reps: repMin })),
    note,
  };
}

/** Ultima performanță devine noua sugestie (comportamentul dinaintea progresiei automate). */
function noProgression(previous: PastSet[]): Suggestion {
  return { sets: previous.map((s) => ({ weight: s.weight_kg, reps: s.reps })), note: '' };
}

export function suggestNextSets(
  rule: ProgressionRule,
  kind: ExerciseKind,
  repMin: number,
  repMax: number,
  previous: PastSet[],
): Suggestion {
  if (previous.length === 0 || rule.kind === 'none') return noProgression(previous);
  const lo = Math.min(repMin, repMax);
  const hi = Math.max(repMin, repMax);

  // Fără o greutate semnificativă de crescut, liniar și Greyskull nu se pot aplica:
  // se comportă ca progresia dublă (progresează pe repetări sau secunde).
  if (kind !== 'reps' && (rule.kind === 'linear' || rule.kind === 'greyskull')) {
    return doubleProgression(kind, lo, hi, rule.incrementKg, previous);
  }

  switch (rule.kind) {
    case 'linear':
      return linearProgression(lo, rule.incrementKg, previous);
    case 'double':
      return doubleProgression(kind, lo, hi, rule.incrementKg, previous);
    case 'greyskull':
      return greyskullProgression(lo, hi, rule.incrementKg, rule.resetPct, previous);
    default:
      return noProgression(previous);
  }
}
