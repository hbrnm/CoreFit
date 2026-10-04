import { describe, expect, it } from 'vitest';
import { countsForProgression, isWorkingSet, nextSetType, parseSetType } from './setTypes';

describe('tipurile de serie', () => {
  it('doar încălzirea nu e serie de lucru', () => {
    expect(isWorkingSet('warmup')).toBe(false);
    expect(['work', 'drop', 'failure'].every((t) => isWorkingSet(t as never))).toBe(true);
  });

  it('drop set-urile nu sunt bază pentru progresie, seriile până la eșec da', () => {
    expect(countsForProgression('drop')).toBe(false);
    expect(countsForProgression('failure')).toBe(true);
    expect(countsForProgression('warmup')).toBe(false);
  });

  it('apăsarea trece prin toate tipurile, în cerc', () => {
    expect(nextSetType('warmup')).toBe('work');
    expect(nextSetType('failure')).toBe('warmup');
  });

  it('citește tipurile din Hevy, Strong și FitNotes', () => {
    expect(parseSetType('warmup')).toBe('warmup');
    expect(parseSetType('W')).toBe('warmup');
    expect(parseSetType('dropset')).toBe('drop');
    expect(parseSetType('F')).toBe('failure');
    expect(parseSetType('normal')).toBe('work');
    expect(parseSetType('')).toBe('work');
  });
});
