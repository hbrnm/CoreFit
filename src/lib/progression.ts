import type { ExerciseKind } from '../data/exercises';
import { formatNum } from './numbers';

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
 * repetări (sau secunde). La pragul de sus, un exercițiu cu greutatea corpului fără greutate
 * adăugată primește o serie în plus (până la BODYWEIGHT_MAX_SETS); altfel doar semnalează.
 *
 * Seriile cu greutăți diferite (piramidă, back-off) progresează fiecare separat la "double".
 * Stagnarea (STALL_SESSIONS sesiuni la rând la aceeași greutate, fără progres) duce la deload
 * la "linear" și "double", cu același procent ca resetul Greyskull.
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

/** Câte sesiuni la rând fără progres, la aceeași greutate, înseamnă stagnare. */
export const STALL_SESSIONS = 3;

/** Plafonul de serii până la care crește un exercițiu cu greutatea corpului. */
export const BODYWEIGHT_MAX_SETS = 5;

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
  /**
   * Numărul de serii sugerat, când progresia îl decide ea (greutatea corpului).
   * Absent = numărul de serii din rutină.
   */
  setCount?: number;
}

export interface ProgressionContext {
  /** sesiunile dinaintea celei din `previous`, cea mai recentă prima, fără deload-uri */
  history?: PastSet[][];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
/** kg în text, cu virgulă: „2,5” */
const kg = (n: number): string => formatNum(round2(n), 2);

const topWeight = (sets: PastSet[]): number => Math.max(...sets.map((s) => s.weight_kg));
const totalReps = (sets: PastSet[]): number => sets.reduce((sum, s) => sum + s.reps, 0);

/**
 * Stagnare: ultimele STALL_SESSIONS sesiuni (inclusiv `previous`) au aceeași greutate de top,
 * niciuna nu a reușit ținta regulii, iar repetările totale nu au crescut de la prima la ultima.
 */
function isStalled(previous: PastSet[], history: PastSet[][], succeeded: (s: PastSet[]) => boolean): boolean {
  const window = [previous, ...history].slice(0, STALL_SESSIONS);
  if (window.length < STALL_SESSIONS || window.some((s) => s.length === 0)) return false;
  const weight = topWeight(previous);
  if (weight <= 0 || window.some((s) => topWeight(s) !== weight)) return false;
  if (window.some(succeeded)) return false;
  return totalReps(window[0]) <= totalReps(window[window.length - 1]);
}

/** Greutatea după deload, rotunjită la pasul rutinei ca să se poată încărca pe bară (60,75 → 60). */
function deloadWeight(weight: number, resetPct: number, stepKg: number): number {
  const raw = weight * (1 - resetPct);
  return stepKg > 0 ? round2(Math.floor(raw / stepKg + 1e-9) * stepKg) : round2(raw);
}

function deload(repMin: number, resetPct: number, stepKg: number, previous: PastSet[]): Suggestion {
  return {
    sets: previous.map((s) => ({ weight: deloadWeight(s.weight_kg, resetPct, stepKg), reps: repMin })),
    note: `${STALL_SESSIONS} sesiuni la rând fără progres la ${kg(topWeight(previous))} kg: deload, greutatea scade cu ${Math.round(resetPct * 100)}%.`,
  };
}

function doubleProgression(
  kind: ExerciseKind,
  repMin: number,
  repMax: number,
  incrementKg: number,
  previous: PastSet[],
): Suggestion {
  const allAtCeiling = previous.every((s) => s.reps >= repMax);
  const unit = kind === 'duration' ? 'secunde' : 'repetări';
  const uniform = previous.every((s) => s.weight_kg === previous[0].weight_kg);
  const unweighted = kind === 'bodyweight' && previous.every((s) => s.weight_kg === 0);
  // Seriile câștigate la greutatea corpului rămân, chiar dacă rutina are mai puține.
  const keepCount = unweighted ? { setCount: previous.length } : {};

  // Piramidă sau back-off: fiecare serie urcă singură, la greutatea ei.
  if (kind === 'reps' && !uniform) {
    const raised = previous.filter((s) => s.reps >= repMax).length;
    return {
      sets: previous.map((s) =>
        s.reps >= repMax
          ? { weight: round2(s.weight_kg + incrementKg), reps: repMin }
          : { weight: s.weight_kg, reps: Math.min(repMax, s.reps + 1) },
      ),
      note:
        raised > 0
          ? `Seriile au greutăți diferite și progresează separat: ${raised} ${raised === 1 ? 'serie primește' : 'serii primesc'} +${kg(incrementKg)} kg, restul o repetare în plus.`
          : 'Seriile au greutăți diferite și progresează separat: o repetare în plus la fiecare, unde a fost posibil.',
    };
  }

  if (allAtCeiling) {
    if (kind === 'reps') {
      return {
        sets: previous.map((s) => ({ weight: round2(s.weight_kg + incrementKg), reps: repMin })),
        note: `Ai atins ${repMax} ${unit} la toate seriile: +${kg(incrementKg)} kg, repetările reîncep de la ${repMin}.`,
      };
    }
    if (unweighted && previous.length < BODYWEIGHT_MAX_SETS) {
      const setCount = previous.length + 1;
      return {
        sets: Array.from({ length: setCount }, () => ({ weight: 0, reps: repMin })),
        note: `Ai atins ${repMax} ${unit} la toate seriile: o serie în plus (${setCount}), repetările reîncep de la ${repMin}.`,
        setCount,
      };
    }
    return {
      sets: previous.map((s) => ({ weight: s.weight_kg, reps: repMax })),
      note:
        kind === 'duration'
          ? `Ai atins ${repMax} ${unit} la toate seriile. Adaugă greutate sau alege un exercițiu mai greu.`
          : `Ai atins ${repMax} ${unit} la toate seriile. Adaugă greutate sau alege o variantă mai grea.`,
      ...keepCount,
    };
  }

  return {
    sets: previous.map((s) => ({ weight: s.weight_kg, reps: Math.min(repMax, s.reps + 1) })),
    note: `Aceeași greutate, o ${kind === 'duration' ? 'secundă' : 'repetare'} în plus față de ultima dată, unde a fost posibil.`,
    ...keepCount,
  };
}

function linearProgression(repMin: number, incrementKg: number, previous: PastSet[]): Suggestion {
  const success = previous.every((s) => s.reps >= repMin);
  if (success) {
    return {
      sets: previous.map((s) => ({ weight: round2(s.weight_kg + incrementKg), reps: repMin })),
      note: `Ai reușit toate seriile la ${repMin} repetări: +${kg(incrementKg)} kg.`,
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
    note = `Serie AMRAP cu ${amrap.reps} repetări, mult peste țintă: salt dublu, +${kg(delta)} kg.`;
  } else if (amrap.reps >= repMax) {
    delta = incrementKg;
    note = `Serie AMRAP cu ${amrap.reps} repetări, peste țintă: +${kg(delta)} kg.`;
  } else if (amrap.reps < repMin) {
    return {
      sets: previous.map((s) => ({ weight: round2(s.weight_kg * (1 - resetPct)), reps: repMin })),
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
  context: ProgressionContext = {},
): Suggestion {
  if (previous.length === 0 || rule.kind === 'none') return noProgression(previous);
  const lo = Math.min(repMin, repMax);
  const hi = Math.max(repMin, repMax);

  // Fără o greutate semnificativă de crescut, liniar și Greyskull nu se pot aplica:
  // se comportă ca progresia dublă (progresează pe repetări sau secunde).
  if (kind !== 'reps' && (rule.kind === 'linear' || rule.kind === 'greyskull')) {
    return doubleProgression(kind, lo, hi, rule.incrementKg, previous);
  }

  if (kind === 'reps' && (rule.kind === 'linear' || rule.kind === 'double')) {
    const succeeded =
      rule.kind === 'linear'
        ? (sets: PastSet[]) => sets.every((s) => s.reps >= lo)
        : (sets: PastSet[]) => sets.every((s) => s.reps >= hi);
    if (isStalled(previous, context.history ?? [], succeeded)) return deload(lo, rule.resetPct, rule.incrementKg, previous);
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
