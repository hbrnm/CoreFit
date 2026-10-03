import { describe, expect, it } from 'vitest';
import { BUILTIN_EXERCISES } from '../data/exercises';
import type { LocalCustomExercise, LocalRoutine } from './db';
import { parseImport, type ParsedImport } from './importCsv';
import { planImport } from './importPlan';
import { buildPlanFile, mergePlan, readPlanFile } from './planShare';

const synced = { client_updated_at: '2026-10-03T00:00:00.000Z', sync_status: 'pending' as const };

const routine = (id: string, name: string, exerciseIds: string[]): LocalRoutine => ({
  id,
  user_id: 'me',
  name,
  notes: '',
  exercises: exerciseIds.map((exercise_id) => ({ exercise_id, sets: 3, rep_min: 8, rep_max: 12, rest_s: 90 })),
  default_progression: 'double',
  progression_increment_kg: 2.5,
  progression_reset_pct: 0.1,
  is_deload: false,
  deleted: false,
  ...synced,
});

const custom = (id: string, name: string): LocalCustomExercise => ({
  id,
  user_id: 'me',
  name,
  muscle: 'back',
  equipment: 'other',
  kind: 'reps',
  deleted: false,
  ...synced,
});

describe('fișierul de plan', () => {
  const routines = [routine('r1', 'Push', ['bench-press', 'c1']), routine('r2', 'Pull', ['pull-up'])];
  const file = buildPlanFile(routines, [custom('c1', 'Landmine Press'), custom('c2', 'Nefolosit')], { '1': 'r1', '4': 'r2', '6': 'șters' });

  it('conține rutinele, doar exercițiile proprii folosite și zilele cu rutine existente', () => {
    expect(file.routines.map((r) => r.name)).toEqual(['Push', 'Pull']);
    expect(file.custom_exercises.map((c) => c.name)).toEqual(['Landmine Press']);
    expect(file.week).toEqual({ '1': 'r1', '4': 'r2' });
    expect(JSON.stringify(file)).not.toMatch(/user_id|client_updated_at/);
  });

  it('trece prin JSON și e recunoscut la citire', () => {
    expect(readPlanFile(JSON.parse(JSON.stringify(file)))).toEqual(file);
    expect(readPlanFile({ kind: 'altceva' })).toMatch(/nu este un plan/);
    expect(readPlanFile({ ...file, version: 99 })).toMatch(/versiune/);
    expect(readPlanFile({ ...file, routines: [{ name: 'x' }] })).toMatch(/incomplet/);
  });

  it('la primire se adaugă lângă planul tău, fără să înlocuiască nimic', () => {
    let n = 0;
    const merged = mergePlan(
      file,
      'friend',
      [routine('mine', 'Push', ['deadlift'])],
      [],
      { '1': 'mine' },
      () => `new${++n}`,
      synced,
    );
    expect(merged.routines.map((r) => r.name)).toEqual(['Push (primit)', 'Pull']);
    expect(merged.routines.every((r) => r.user_id === 'friend')).toBe(true);
    // exercițiul propriu e creat la prieten, iar rutina îl folosește cu id-ul nou
    expect(merged.customExercises).toHaveLength(1);
    expect(merged.routines[0].exercises.map((e) => e.exercise_id)).toEqual(['bench-press', merged.customExercises[0].id]);
    // luni era ocupată: rămâne a ta; joi era liberă: primește Pull
    expect(merged.weekSlots['1']).toBe('mine');
    expect(merged.weekSlots['4']).toBe(merged.routines[1].id);
    expect(merged.busyDays).toEqual(['1']);
  });

  it('refolosește un exercițiu propriu cu același nume', () => {
    const merged = mergePlan(file, 'friend', [], [custom('own', 'landmine press')], {}, () => 'x', synced);
    expect(merged.customExercises).toHaveLength(0);
    expect(merged.routines[0].exercises[1].exercise_id).toBe('own');
  });
});

describe('planul de import', () => {
  const CSV = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-01-15 18:30:00,Heavy,1h,Bench Press (Barbell),1,100,5,0,0,,,8
2024-01-15 18:30:00,Heavy,1h,Bench Press (Barbell),2,100,4,0,0,,,
2024-01-15 18:30:00,Heavy,1h,Landmine Press,1,30,10,0,0,,,
2024-01-15 18:30:00,Heavy,1h,Zercher Carry,1,0,0,0,40,,,
`;
  const parsed = parseImport(CSV, 'kg') as ParsedImport;

  it('pune seriile pe exercițiile din catalog sau pe ale tale, și creează restul', async () => {
    const plan = await planImport(parsed, 'me', BUILTIN_EXERCISES, [custom('own', 'Landmine Press')], synced);
    expect(plan.sessions).toHaveLength(1);
    expect(plan.logs.map((l) => `${l.exercise_id} ${l.weight_kg}x${l.reps}`)).toEqual([
      'bench-press 100x5',
      'bench-press 100x4',
      'own 30x10',
      `${plan.newCustom[0].id} 0x40`,
    ]);
    expect(plan.newCustom.map((c) => `${c.name} ${c.kind} ${c.muscle}`)).toEqual(['Zercher Carry duration core']);
    expect(plan.guessedMuscle).toEqual(['Zercher Carry']);
    expect(plan.logs[0]).toMatchObject({ rpe: 8, effort_scale: 'rpe', set_type: 'work', session_id: plan.sessions[0].id });
    expect(plan.logs[1]).toMatchObject({ rpe: null, effort_scale: null });
  });

  it('seriile primesc momente în ordine, în timpul antrenamentului', async () => {
    const plan = await planImport(parsed, 'me', BUILTIN_EXERCISES, [], synced);
    const times = plan.logs.map((l) => Date.parse(l.logged_at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBeGreaterThan(Date.parse(plan.sessions[0].started_at));
    expect(times[times.length - 1]).toBeLessThan(Date.parse(plan.sessions[0].ended_at as string));
  });

  it('același fișier dă aceleași id-uri: un import repetat nu dublează', async () => {
    const a = await planImport(parsed, 'me', BUILTIN_EXERCISES, [], synced);
    const b = await planImport(parsed, 'me', BUILTIN_EXERCISES, [], synced);
    expect(b.sessions.map((s) => s.id)).toEqual(a.sessions.map((s) => s.id));
    expect(b.logs.map((l) => l.id)).toEqual(a.logs.map((l) => l.id));
    expect(new Set(a.logs.map((l) => l.id)).size).toBe(a.logs.length);
  });
});
