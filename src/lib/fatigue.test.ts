import { describe, expect, it } from 'vitest';
import type { LocalWorkoutLog } from './db';
import {
  FATIGUE_FULL_SETS,
  FATIGUE_HALF_LIFE_H,
  fatigueLevel,
  muscleFatigue,
  setEffort,
} from './fatigue';
import { MAX_1RM_REPS, weightForReps, estimate1RM } from './numbers';
import { bestEstimated1RM } from './workoutStats';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

let n = 0;
function set(exercise_id: string, h: number, over: Partial<LocalWorkoutLog> = {}): LocalWorkoutLog {
  n += 1;
  return {
    id: `l${n}`,
    user_id: 'u',
    deleted: false,
    session_id: 's',
    exercise_id,
    exercise_name: exercise_id,
    set_type: 'work',
    set_order: n,
    weight_kg: 60,
    reps: 8,
    rpe: null,
    effort_scale: null,
    pain_detected: false,
    logged_at: hoursAgo(h),
    client_updated_at: hoursAgo(h),
    sync_status: 'synced',
    ...over,
  };
}

const catalog = new Map();
const of = (rows: ReturnType<typeof muscleFatigue>, muscle: string) => rows.find((r) => r.muscle === muscle)!;

describe('efortul unui set', () => {
  it('RIR și RPE dau același rezultat pentru același efort', () => {
    expect(setEffort({ rpe: 0, effort_scale: 'rir' })).toBe(1);
    expect(setEffort({ rpe: 10, effort_scale: 'rpe' })).toBe(1);
    expect(setEffort({ rpe: 2, effort_scale: 'rir' })).toBe(setEffort({ rpe: 8, effort_scale: 'rpe' }));
    expect(setEffort({ rpe: 4, effort_scale: 'rir' })).toBe(0.5);
  });

  it('un set fără efort notat contează ca unul obișnuit', () => {
    expect(setEffort({ rpe: null, effort_scale: null })).toBe(0.8);
  });
});

describe('oboseala pe grupe', () => {
  it('fără seturi recente, toate grupele sunt odihnite', () => {
    const rows = muscleFatigue([], catalog, NOW);
    expect(rows.every((r) => r.value === 0 && r.level === 'fresh' && r.hoursToFresh === 0)).toBe(true);
  });

  it(`${FATIGUE_FULL_SETS} seturi grele chiar acum = oboseală maximă pe grupa principală`, () => {
    const logs = Array.from({ length: FATIGUE_FULL_SETS }, () => set('bench-press', 0, { rpe: 0, effort_scale: 'rir' }));
    const rows = muscleFatigue(logs, catalog, NOW);
    expect(of(rows, 'chest').value).toBe(1);
    expect(of(rows, 'chest').level).toBe('tired');
    // grupele ajutătoare primesc jumătate
    expect(of(rows, 'triceps').value).toBeCloseTo(0.5);
    expect(of(rows, 'quads').value).toBe(0);
  });

  it(`scade la jumătate după ${FATIGUE_HALF_LIFE_H} de ore, treptat, fără prag`, () => {
    const at = (h: number) => of(muscleFatigue([set('back-squat', h, { rpe: 0, effort_scale: 'rir' })], catalog, NOW), 'quads').value;
    expect(at(FATIGUE_HALF_LIFE_H)).toBeCloseTo(at(0) / 2);
    expect(at(FATIGUE_HALF_LIFE_H * 2)).toBeCloseTo(at(0) / 4);
    expect(at(30)).toBeLessThan(at(29));
  });

  it('ignoră încălzirea, seriile șterse, seriile din viitor și plank-ul fără greutate', () => {
    const logs = [
      set('bench-press', 1, { set_type: 'warmup' }),
      set('bench-press', 1, { deleted: true }),
      set('bench-press', -5),
      set('plank', 1, { weight_kg: 0, reps: 60 }),
    ];
    expect(muscleFatigue(logs, catalog, NOW).every((r) => r.value === 0)).toBe(true);
  });

  it('estimează orele până la refacere', () => {
    const logs = Array.from({ length: 8 }, () => set('deadlift', 0, { rpe: 0, effort_scale: 'rir' }));
    const back = of(muscleFatigue(logs, catalog, NOW), 'back');
    // 0,8 → sub 0,2 după două înjumătățiri
    expect(back.value).toBeCloseTo(0.8);
    expect(back.hoursToFresh).toBe(FATIGUE_HALF_LIFE_H * 2);
  });

  it('nivelurile', () => {
    expect(fatigueLevel(0.1)).toBe('fresh');
    expect(fatigueLevel(0.3)).toBe('partial');
    expect(fatigueLevel(0.5)).toBe('tired');
  });
});

describe('1RM', () => {
  it('cea mai bună serie, doar până la 12 repetări', () => {
    const best = bestEstimated1RM([
      { weight_kg: 100, reps: 5 },
      { weight_kg: 105, reps: 2 },
      { weight_kg: 20, reps: 40 }, // nu intră
    ]);
    expect(best).toEqual({ value: estimate1RM(100, 5), weightKg: 100, reps: 5 });
    expect(bestEstimated1RM([{ weight_kg: 20, reps: 40 }])).toBeNull();
  });

  it('greutatea pentru un număr de repetări e inversul estimării', () => {
    const oneRm = estimate1RM(100, 5) as number;
    expect(weightForReps(oneRm, 5)).toBeCloseTo(100);
    expect(weightForReps(oneRm, 1)).toBe(oneRm);
    expect(weightForReps(oneRm, MAX_1RM_REPS + 1)).toBeNull();
    expect(weightForReps(0, 5)).toBeNull();
  });
});
