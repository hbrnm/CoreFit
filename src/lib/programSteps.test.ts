import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '../data/health';
import { buildSteps, stepLabel, workPosition } from './programSteps';

const ex = (over: object) => ({ id: 'x', name: 'X', how: '', kind: 'reps' as const, sets: 2, reps: 8, restS: 30, ...over });

describe('pașii programului ghidat', () => {
  it('serii, apoi pauze între ele, fără pauză la final', () => {
    const steps = buildSteps({ exercises: [ex({ id: 'a' }), ex({ id: 'b', sets: 1 })] });
    expect(steps.map((s) => s.kind)).toEqual(['work', 'rest', 'work', 'rest', 'work']);
  });

  it('pe fiecare parte, câte o serie pentru stânga și una pentru dreapta', () => {
    const steps = buildSteps({ exercises: [ex({ sets: 1, perSide: true, kind: 'hold', holdS: 10, restS: 0 })] });
    expect(steps.map((s) => [s.side, s.seconds])).toEqual([
      ['left', 10],
      ['right', 10],
    ]);
  });

  it('poziția numără doar seriile', () => {
    const steps = buildSteps({ exercises: [ex({ id: 'a' }), ex({ id: 'b', sets: 1 })] });
    expect(workPosition(steps, 0)).toEqual({ n: 1, total: 3 });
    expect(workPosition(steps, 1)).toEqual({ n: 1, total: 3 }); // pauza de după prima serie
    expect(workPosition(steps, 4)).toEqual({ n: 3, total: 3 });
  });

  it('eticheta pasului', () => {
    const [hold] = buildSteps({ exercises: [ex({ kind: 'hold', holdS: 10, sets: 5, perSide: true })] });
    expect(stepLabel(hold)).toBe('Seria 1 din 5 · partea stângă · 10 s');
    const [reps] = buildSteps({ exercises: [ex({})] });
    expect(stepLabel(reps)).toBe('Seria 1 din 2 · 8 repetări');
  });

  it('fiecare program generic din catalog are cel puțin un pas de lucru (McGill are ecranul lui)', () => {
    for (const p of PROGRAMS.filter((x) => !x.special)) expect(buildSteps(p).some((s) => s.kind === 'work'), p.id).toBe(true);
  });
});
