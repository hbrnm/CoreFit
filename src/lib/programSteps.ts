import type { HealthProgram } from '../data/health';

/*
 * Programul ghidat ca listă de pași: fiecare serie (pe fiecare parte, unde e cazul) și pauzele
 * dintre ele. Fără pauză după ultima serie a programului.
 */

export interface Step {
  kind: 'work' | 'rest';
  exIdx: number;
  setNo: number;
  sets: number;
  side: 'left' | 'right' | null;
  /** menținere sau pauză, în secunde; null la seriile cu repetări */
  seconds: number | null;
  reps: number | null;
}

export function buildSteps(program: Pick<HealthProgram, 'exercises'>): Step[] {
  const steps: Step[] = [];
  program.exercises.forEach((ex, exIdx) => {
    const sides: Array<'left' | 'right' | null> = ex.perSide ? ['left', 'right'] : [null];
    for (let setNo = 1; setNo <= ex.sets; setNo += 1) {
      for (const side of sides) {
        steps.push({
          kind: 'work',
          exIdx,
          setNo,
          sets: ex.sets,
          side,
          seconds: ex.kind === 'hold' ? (ex.holdS ?? 30) : null,
          reps: ex.kind === 'reps' ? (ex.reps ?? 10) : null,
        });
      }
      const last = exIdx === program.exercises.length - 1 && setNo === ex.sets;
      if (ex.restS > 0 && !last) {
        steps.push({ kind: 'rest', exIdx, setNo, sets: ex.sets, side: null, seconds: ex.restS, reps: null });
      }
    }
  });
  return steps;
}

/** „Pasul 4 din 12”: se numără doar seriile, nu și pauzele. */
export function workPosition(steps: readonly Step[], index: number): { n: number; total: number } {
  const total = steps.filter((s) => s.kind === 'work').length;
  const n = steps.slice(0, index + 1).filter((s) => s.kind === 'work').length;
  return { n: Math.max(1, n), total };
}

/** „Seria 2 din 5 · partea stângă · 10 s” sub numele exercițiului. */
export function stepLabel(step: Step): string {
  const parts = [`Seria ${step.setNo} din ${step.sets}`];
  if (step.side) parts.push(step.side === 'left' ? 'partea stângă' : 'partea dreaptă');
  if (step.seconds !== null) parts.push(`${step.seconds} s`);
  else if (step.reps !== null) parts.push(`${step.reps} repetări`);
  return parts.join(' · ');
}
