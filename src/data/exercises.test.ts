import { describe, expect, it } from 'vitest';
import { matchExercise } from '../lib/exerciseMatch';
import { BUILTIN_EXERCISES, EQUIPMENT_LABELS, MUSCLE_LABELS } from './exercises';

describe('catalogul de exerciții', () => {
  it('id-uri și nume unice', () => {
    const ids = BUILTIN_EXERCISES.map((e) => e.id);
    const names = BUILTIN_EXERCISES.map((e) => e.name.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('grupe și echipament valide; o grupă ajutătoare nu e și cea principală', () => {
    for (const e of BUILTIN_EXERCISES) {
      expect(MUSCLE_LABELS[e.muscle], e.id).toBeDefined();
      expect(EQUIPMENT_LABELS[e.equipment], e.id).toBeDefined();
      for (const s of e.synergists ?? []) {
        expect(MUSCLE_LABELS[s], e.id).toBeDefined();
        expect(s, e.id).not.toBe(e.muscle);
      }
    }
  });

  it('fiecare exercițiu din catalog se recunoaște după propriul nume (importul se bazează pe asta)', () => {
    for (const e of BUILTIN_EXERCISES) {
      expect(matchExercise(e.name, BUILTIN_EXERCISES)?.id, e.name).toBe(e.id);
    }
  });
});
