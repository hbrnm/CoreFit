import { describe, expect, it } from 'vitest';
import type { LocalProfile, LocalRoutine } from './db';
import type { MuscleFatigue } from './fatigue';
import { tiredMusclesFor, todayPlan } from './today';

const synced = { client_updated_at: '2026-10-01T00:00:00.000Z', sync_status: 'synced' as const };

const routine = (id: string, exercises: string[], deleted = false): LocalRoutine => ({
  id,
  user_id: 'u',
  name: id,
  notes: '',
  exercises: exercises.map((exercise_id) => ({ exercise_id, sets: 3, rep_min: 8, rep_max: 12, rest_s: 90 })),
  default_progression: 'none',
  progression_increment_kg: 2.5,
  progression_reset_pct: 0.1,
  is_deload: false,
  deleted,
  ...synced,
});

const profile = (over: Partial<LocalProfile> = {}): LocalProfile =>
  ({
    user_id: 'u',
    week_starts_on: 'monday',
    week_slots: {},
    week_moves: [],
    ...synced,
    ...over,
  }) as LocalProfile;

// 2026-10-05 e luni
const MON = '2026-10-05';
const push = routine('push', ['bench-press', 'overhead-press']);
const legs = routine('legs', ['back-squat']);

describe('planul de azi', () => {
  it('rutina fixă a zilei', () => {
    const p = profile({ week_slots: { '1': 'push', '3': 'legs' } });
    expect(todayPlan(p, MON, [push, legs])).toEqual({ today: push, next: { date: '2026-10-07', routine: legs } });
  });

  it('zi liberă: următorul antrenament, chiar și în săptămâna următoare', () => {
    const p = profile({ week_slots: { '1': 'push' } });
    const plan = todayPlan(p, '2026-10-06', [push]);
    expect(plan.today).toBeNull();
    expect(plan.next).toEqual({ date: '2026-10-12', routine: push });
  });

  it('o rutină mutată în altă zi săptămâna asta pleacă de azi și apare acolo', () => {
    const p = profile({
      week_slots: { '1': 'push' },
      week_moves: [{ id: 'm', week_of: MON, from_date: MON, to_date: '2026-10-08', routine_id: 'push' }],
    });
    const plan = todayPlan(p, MON, [push]);
    expect(plan.today).toBeNull();
    expect(plan.next).toEqual({ date: '2026-10-08', routine: push });
  });

  it('o rutină ștearsă nu mai apare în plan', () => {
    const p = profile({ week_slots: { '1': 'gone' } });
    expect(todayPlan(p, MON, [routine('gone', [], true)])).toEqual({ today: null, next: null });
  });
});

describe('grupe obosite pentru rutina de azi', () => {
  const f = (muscle: MuscleFatigue['muscle'], value: number, level: MuscleFatigue['level']): MuscleFatigue => ({
    muscle,
    label: muscle,
    value,
    level,
    hoursToFresh: 0,
  });

  it('doar grupele principale ale rutinei, doar cele obosite, cele mai obosite primele', () => {
    const fatigue = [f('chest', 0.6, 'tired'), f('shoulders', 0.9, 'tired'), f('triceps', 0.8, 'tired'), f('quads', 0.3, 'partial')];
    expect(tiredMusclesFor(push, fatigue)).toEqual(['Umeri', 'Piept']);
    expect(tiredMusclesFor(legs, fatigue)).toEqual([]);
  });
});
