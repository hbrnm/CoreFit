import { db } from './db';
import type { ImportPlan } from './importPlan';

/**
 * Câte antrenamente din plan sunt deja în baza locală (importate înainte, inclusiv cele șterse
 * între timp). Acestea se sar la import.
 */
export async function countAlreadyImported(plan: ImportPlan): Promise<number> {
  const found = await db.workoutSessions.bulkGet(plan.sessions.map((s) => s.id));
  return found.filter(Boolean).length;
}

/**
 * Scrie planul în baza locală, într-o singură tranzacție. Antrenamentele care există deja
 * rămân neatinse: un import repetat nu dublează și nu readuce ce ai șters sau modificat.
 * Rândurile noi sunt marcate pentru sincronizare.
 */
export async function applyImport(plan: ImportPlan): Promise<{ sessions: number; sets: number; exercises: number }> {
  return db.transaction('rw', db.workoutSessions, db.workoutLogs, db.customExercises, async () => {
    const existing = await db.workoutSessions.bulkGet(plan.sessions.map((s) => s.id));
    const skip = new Set(existing.filter((s) => s !== undefined).map((s) => s.id));
    const sessions = plan.sessions.filter((s) => !skip.has(s.id));
    const logs = plan.logs.filter((l) => !skip.has(l.session_id as string));

    const usedCustom = new Set(logs.map((l) => l.exercise_id));
    const customExisting = await db.customExercises.bulkGet(plan.newCustom.map((c) => c.id));
    const custom = plan.newCustom.filter((c, i) => usedCustom.has(c.id) && !customExisting[i]);

    await db.customExercises.bulkPut(custom);
    await db.workoutSessions.bulkPut(sessions);
    await db.workoutLogs.bulkPut(logs);
    return { sessions: sessions.length, sets: logs.length, exercises: custom.length };
  });
}
