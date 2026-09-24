import { describe, expect, it } from 'vitest';
import type { LocalProfile } from './db';
import { bmr, computeTargets, fromPer100, perServing, recipeTotals } from './nutrition';

function profile(over: Partial<LocalProfile> = {}): LocalProfile {
  return {
    user_id: 'u',
    full_name: '',
    training_split: 'full_body',
    nutrition_phase: 'maintenance',
    spine_hygiene_alert: false,
    sex: 'male',
    birth_year: 1981,
    height_cm: 180,
    activity_level: 'sedentary',
    kcal_target_override: null,
    meal_plan: 'standard',
    long_term_focus: null,
    long_term_also: [],
    effort_scale: 'rir',
    week_starts_on: 'monday',
    favorite_exercise_ids: [],
    week_slots: {},
    week_moves: [],
    client_updated_at: '2026-01-01T00:00:00.000Z',
    sync_status: 'synced',
    ...over,
  };
}

const oil = {
  name: 'Ulei',
  grams: 20,
  kcal100: 884,
  protein100: 0,
  carbs100: 0,
  fat100: 100,
  fiber100: 0,
  sugar100: 0,
  sodium100: 0,
};

describe('calorii din grame', () => {
  it('scalează valorile de la 100 g', () => {
    const totals = fromPer100(oil, 20);
    expect(totals.kcal).toBeCloseTo(176.8);
    expect(totals.fat).toBe(20);
    expect(totals.protein).toBe(0);
  });

  it('împarte rețeta la numărul de porții', () => {
    const one = perServing(recipeTotals([oil, { ...oil, grams: 20 }]), 2);
    expect(one.kcal).toBeCloseTo(176.8);
    expect(one.fat).toBe(20);
  });
});

describe('metabolism bazal', () => {
  it('folosește Mifflin-St Jeor pentru bărbat', () => {
    expect(bmr('male', 80, 180, 45)).toBe(1705);
  });

  it('folosește constanta de femeie', () => {
    expect(bmr('female', 80, 180, 45)).toBe(1539);
  });

  it('nu calculează ținta fără datele din profil', () => {
    expect(computeTargets(profile({ sex: null }), 80, 2026)).toBeNull();
    expect(computeTargets(profile(), null, 2026)).toBeNull();
  });

  it('separă bazalul de întreținerea cu activitate', () => {
    const targets = computeTargets(profile(), 80, 2026);
    expect(targets?.bmrKcal).toBe(1705);
    expect(targets?.maintenanceKcal).toBe(2046);
    expect(targets?.kcal).toBe(2050);
    expect(targets?.protein).toBe(144);
  });
});
