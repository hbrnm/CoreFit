import { describe, expect, it } from 'vitest';
import { builtinExercise } from '../data/exercises';
import type { LocalWorkoutLog } from './db';
import { estimate1RM } from './numbers';
import { platesPerSide } from './plates';
import { detectRecords, groupLinked, setScore, setVolume } from './workoutStats';

let n = 0;
function log(exercise_id: string, weight_kg: number, reps: number, over: Partial<LocalWorkoutLog> = {}): LocalWorkoutLog {
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
    weight_kg,
    reps,
    rpe: null,
    effort_scale: null,
    pain_detected: false,
    logged_at: '2026-10-01T10:00:00.000Z',
    client_updated_at: '2026-10-01T10:00:00.000Z',
    sync_status: 'synced',
    ...over,
  } as LocalWorkoutLog;
}

describe('1RM estimat (Epley)', () => {
  it('o singură repetare este chiar 1RM', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('aplică Epley între 2 și 12 repetări', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2);
    expect(estimate1RM(100, 12)).toBeCloseTo(140, 5);
  });

  it('nu estimează peste 12 repetări, fără greutate sau fără repetări', () => {
    expect(estimate1RM(100, 13)).toBeNull();
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(100, 0)).toBeNull();
  });
});

describe('scorul și volumul unui set', () => {
  it('greutatea corpului cu greutate adăugată bate orice set fără greutate', () => {
    expect(setScore('bodyweight', 5, 1)).toBeGreaterThan(setScore('bodyweight', 0, 50));
  });

  it('exercițiile cronometrate nu au volum', () => {
    expect(setVolume('duration', 10, 60)).toBe(0);
    expect(setVolume('reps', 100, 5)).toBe(500);
  });
});

describe('recorduri', () => {
  const catalog = new Map();

  it('declară record doar când bate tot istoricul', () => {
    const earlier = [log('bench-press', 100, 5)];
    const session = [log('bench-press', 100, 5), log('bench-press', 102.5, 5)];
    const records = detectRecords(session, earlier, catalog);
    expect(records).toEqual([{ exerciseId: 'bench-press', exerciseName: 'bench-press', weightKg: 102.5, reps: 5 }]);
  });

  it('prima sesiune dintr-un exercițiu nu e record', () => {
    expect(detectRecords([log('bench-press', 100, 5)], [], catalog)).toEqual([]);
  });

  it('ignoră încălzirile și seriile șterse, din ambele părți', () => {
    const earlier = [log('back-squat', 100, 5), log('back-squat', 200, 5, { set_type: 'warmup' })];
    const session = [
      log('back-squat', 150, 5, { set_type: 'warmup' }),
      log('back-squat', 150, 5, { deleted: true }),
      log('back-squat', 105, 5),
    ];
    expect(detectRecords(session, earlier, catalog).map((r) => r.weightKg)).toEqual([105]);
  });
});

describe('superseturi', () => {
  it('grupează rândurile legate de următorul', () => {
    const links = [true, false, true, true, false];
    expect(groupLinked(links, (l) => l)).toEqual([[0, 1], [2, 3, 4]]);
  });

  it('o legătură pe ultimul rând nu pierde rândul', () => {
    expect(groupLinked([false, true], (l) => l)).toEqual([[0], [1]]);
  });
});

describe('discuri pe parte', () => {
  it('împarte greutatea fără bară pe cele două părți', () => {
    expect(platesPerSide(100, 20)).toEqual({ plates: [25, 15], leftover: 0 });
  });

  it('raportează ce nu se poate încărca exact', () => {
    expect(platesPerSide(21, 20)).toEqual({ plates: [], leftover: 1 });
  });

  it('sub greutatea barei nu pune nimic', () => {
    expect(platesPerSide(15, 20)).toEqual({ plates: [], leftover: 0 });
  });
});

describe('exerciții pe o parte', () => {
  it('sunt marcate în catalog doar cele unilaterale', () => {
    expect(builtinExercise('db-row')?.perSide).toBe(true);
    expect(builtinExercise('side-plank')?.perSide).toBe(true);
    expect(builtinExercise('bench-press')?.perSide).toBeUndefined();
  });
});
