import Dexie from 'dexie';
import { db, stamp, type LocalProfile } from './db';
import { localDateStr } from './date';

export const BACKUP_VERSION = 1;

const OWNED = [
  'workoutSessions',
  'workoutLogs',
  'routines',
  'customExercises',
  'spineAssessments',
  'painLogs',
  'healthSessions',
  'foodEntries',
  'customFoods',
  'recipes',
  'preventionMarks',
] as const;

type OwnedName = (typeof OWNED)[number];

const FILE_KEY: Record<OwnedName, string> = {
  workoutSessions: 'workout_sessions',
  workoutLogs: 'workout_sets',
  routines: 'routines',
  customExercises: 'custom_exercises',
  spineAssessments: 'spine_assessments',
  painLogs: 'pain_logs',
  healthSessions: 'health_sessions',
  foodEntries: 'food_entries',
  customFoods: 'custom_foods',
  recipes: 'recipes',
  preventionMarks: 'prevention_marks',
};

export interface BackupFile {
  schemaVersion: number;
  exported_at: string;
  profile: LocalProfile | null;
  workout_sessions: unknown[];
  workout_sets: unknown[];
  routines: unknown[];
  custom_exercises: unknown[];
  spine_assessments: unknown[];
  pain_logs: unknown[];
  health_sessions: unknown[];
  daily_nutrition: unknown[];
  food_entries: unknown[];
  custom_foods: unknown[];
  recipes: unknown[];
  prevention_marks: unknown[];
}

function isRow(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function buildBackup(userId: string): Promise<BackupFile> {
  const mine = <T extends { user_id: string }>(rows: T[]): T[] => rows.filter((r) => r.user_id === userId);
  const alive = <T extends { deleted?: boolean }>(rows: T[]): T[] => rows.filter((r) => !r.deleted);
  const [profile, sessions, sets, routines, customExercises, spine, pain, health, nutrition, foods, customFoods, recipes, prevention] =
    await Promise.all([
      db.profiles.get(userId),
      db.workoutSessions.where('[user_id+started_at]').between([userId, Dexie.minKey], [userId, Dexie.maxKey]).toArray(),
      db.workoutLogs.where('[user_id+logged_at]').between([userId, Dexie.minKey], [userId, Dexie.maxKey]).toArray(),
      db.routines.where('user_id').equals(userId).toArray(),
      db.customExercises.where('user_id').equals(userId).toArray(),
      db.spineAssessments.where('[user_id+assessed_at]').between([userId, Dexie.minKey], [userId, Dexie.maxKey]).toArray(),
      db.painLogs.where('[user_id+logged_at]').between([userId, Dexie.minKey], [userId, Dexie.maxKey]).toArray(),
      db.healthSessions.where('[user_id+completed_at]').between([userId, Dexie.minKey], [userId, Dexie.maxKey]).toArray(),
      db.nutritionLogs.where('user_id').equals(userId).toArray(),
      db.foodEntries.where('user_id').equals(userId).toArray(),
      db.customFoods.where('user_id').equals(userId).toArray(),
      db.recipes.where('user_id').equals(userId).toArray(),
      db.preventionMarks.where('user_id').equals(userId).toArray(),
    ]);

  return {
    schemaVersion: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    profile: profile ?? null,
    workout_sessions: alive(mine(sessions)),
    workout_sets: alive(mine(sets)),
    routines: alive(mine(routines)),
    custom_exercises: alive(mine(customExercises)),
    spine_assessments: alive(mine(spine)),
    pain_logs: alive(mine(pain)),
    health_sessions: alive(mine(health)),
    daily_nutrition: mine(nutrition),
    food_entries: alive(mine(foods)),
    custom_foods: alive(mine(customFoods)),
    recipes: alive(mine(recipes)),
    prevention_marks: alive(mine(prevention)),
  };
}

export async function downloadBackup(userId: string): Promise<void> {
  const payload = await buildBackup(userId);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `corefit-export-${localDateStr()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readBackup(raw: unknown): { ok: true; data: BackupFile } | { ok: false; error: string } {
  if (!isRow(raw) || raw.schemaVersion !== BACKUP_VERSION) {
    return { ok: false, error: 'Fișierul nu este un export CoreFit, versiunea 1.' };
  }
  const data = raw as unknown as BackupFile;
  for (const key of Object.values(FILE_KEY)) {
    if (!Array.isArray(data[key as keyof BackupFile])) return { ok: false, error: 'Exportul este incomplet.' };
  }
  if (!Array.isArray(data.daily_nutrition)) return { ok: false, error: 'Exportul este incomplet.' };
  return { ok: true, data };
}

function claim(row: Record<string, unknown>, userId: string): Record<string, unknown> {
  return { ...row, user_id: userId, ...stamp() };
}

export async function applyBackup(userId: string, data: BackupFile, mode: 'merge' | 'replace'): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of OWNED) {
      const table = db.table(name);
      const rows = (data[FILE_KEY[name] as keyof BackupFile] as unknown[]).filter(isRow);
      const incoming = new Map(rows.filter((r) => typeof r.id === 'string').map((r) => [r.id as string, r]));
      if (mode === 'replace') {
        const existing = await table.where('user_id').equals(userId).toArray();
        for (const row of existing) {
          if (!incoming.has(row.id)) await table.update(row.id, { deleted: true, ...stamp() });
        }
      }
      for (const row of incoming.values()) {
        if (mode === 'merge') {
          const local = await table.get(row.id as string);
          if (local && String(local.client_updated_at ?? '') > String(row.client_updated_at ?? '')) continue;
        }
        await table.put(claim(row, userId));
      }
    }

    const days = data.daily_nutrition.filter(isRow).filter((r) => typeof r.log_date === 'string');
    if (mode === 'replace') {
      const existing = await db.nutritionLogs.where('user_id').equals(userId).toArray();
      const keep = new Set(days.map((r) => r.log_date as string));
      for (const row of existing) {
        if (!keep.has(row.log_date)) await db.nutritionLogs.delete([userId, row.log_date]);
      }
    }
    for (const row of days) {
      const date = row.log_date as string;
      if (mode === 'merge') {
        const local = await db.nutritionLogs.get([userId, date]);
        if (local && local.client_updated_at > String(row.client_updated_at ?? '')) continue;
      }
      await db.nutritionLogs.put(claim(row, userId) as never);
    }

    if (isRow(data.profile)) {
      const local = await db.profiles.get(userId);
      const imported = claim(data.profile, userId);
      if (local && mode === 'merge' && local.client_updated_at > String(data.profile.client_updated_at ?? '')) return;
      await db.profiles.put({ ...(local ?? {}), ...imported, user_id: userId, ...stamp() } as LocalProfile);
    }
  });
}
