import type { SupabaseClient } from '@supabase/supabase-js';
import type { IndexableType, Table } from 'dexie';
import { isFocus } from './longTerm';
import {
  db,
  type ActivityLevel,
  type LocalProfile,
  type LongTermFocus,
  type NutritionPhase,
  type EffortScale,
  type WeekMove,
  type WeekStartsOn,
  type IsoWeekday,
  type Sex,
  type SyncStatus,
  type TrainingSplit,
} from './db';

/*
 * Strategia de sincronizare (offline-first):
 *  1. Scrierile merg mereu în IndexedDB, cu sync_status = 'pending'.
 *  2. Trimitem (upsert) tot ce e 'pending' sau 'error'.
 *  3. Aducem de pe server modificările mai noi decât ultimul cursor (updated_at).
 *  4. Conflict: câștigă modificarea cu client_updated_at mai nou; o modificare locală
 *     netrimisă încă nu este niciodată suprascrisă de una mai veche.
 *
 * Toate tabelele cu id generat pe client folosesc aceeași logică, descrisă de un SyncSpec.
 */

const PAGE_SIZE = 500;
const EPOCH = '1970-01-01T00:00:00Z';

interface RemoteError {
  code?: string;
  message: string;
}

/** Erorile PostgREST au `code`; erorile de rețea (fetch eșuat) nu. */
function isRejected(error: RemoteError): boolean {
  return Boolean(error.code);
}

export function describeError(e: unknown): string {
  const err = e as Partial<RemoteError> | null;
  const code = err?.code;
  if (code === '42501') return 'Acces refuzat de server. Conectează-te din nou.';
  if (code === '42P01' || code === 'PGRST205' || code === '42703') {
    return 'Schema din Supabase nu e la zi. Rulează migrările SQL din supabase/migrations.';
  }
  if (code === '23503') return 'Contul nu există pe server. Conectează-te din nou.';
  if (code) return `Serverul a respins datele (${code}): ${err?.message ?? ''}`.trim();
  const msg = err?.message ?? '';
  if (/fetch|network|load failed/i.test(msg)) return 'Fără conexiune la server.';
  return msg || 'Eroare necunoscută la sincronizare.';
}

function stripLocal<T extends { sync_status: SyncStatus }>(row: T): Omit<T, 'sync_status'> {
  const { sync_status, ...rest } = row;
  void sync_status;
  return rest;
}

const toIso = (s: string): string => new Date(s).toISOString();

interface SyncSpec {
  remote: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any, any>;
  onConflict: string;
  /** calea cheii primare locale, pentru interogări */
  keyPath: string;
  keyOf: (row: Record<string, unknown>) => IndexableType;
  /** rândurile locale nu păstrează `id`-ul de pe server (cazul nutrition) */
  dropRemoteId: boolean;
}

const byId = (remote: string, table: SyncSpec['table']): SyncSpec => ({
  remote,
  table,
  onConflict: 'id',
  keyPath: 'id',
  keyOf: (r) => r.id as string,
  dropRemoteId: false,
});

const SPECS: SyncSpec[] = [
  byId('workout_sessions', db.workoutSessions),
  byId('workout_logs', db.workoutLogs),
  byId('routines', db.routines),
  byId('custom_exercises', db.customExercises),
  byId('spine_assessments', db.spineAssessments),
  byId('pain_logs', db.painLogs),
  byId('health_sessions', db.healthSessions),
  byId('food_entries', db.foodEntries),
  byId('custom_foods', db.customFoods),
  byId('recipes', db.recipes),
  byId('prevention_marks', db.preventionMarks),
  {
    remote: 'daily_nutrition_logs',
    table: db.nutritionLogs,
    onConflict: 'user_id,log_date',
    keyPath: '[user_id+log_date]',
    keyOf: (r) => [r.user_id as string, r.log_date as string],
    dropRemoteId: true,
  },
];

// ------------------------------------------------------------------ trimitere

async function pushSpec(client: SupabaseClient, spec: SyncSpec, userId: string): Promise<void> {
  const rows: Array<Record<string, unknown> & { sync_status: SyncStatus; client_updated_at: string }> =
    await spec.table
      .where('sync_status')
      .anyOf('pending', 'error')
      .and((r: { user_id: string }) => r.user_id === userId)
      .toArray();
  if (rows.length === 0) return;

  const { error } = await client.from(spec.remote).upsert(rows.map(stripLocal), { onConflict: spec.onConflict });

  const status: SyncStatus = error ? (isRejected(error) ? 'error' : 'pending') : 'synced';
  await db.transaction('rw', spec.table, async () => {
    for (const r of rows) {
      await spec.table
        .where(spec.keyPath)
        .equals(spec.keyOf(r))
        .modify((cur: { client_updated_at: string; sync_status: SyncStatus }) => {
          // dacă rândul a fost modificat între timp, rămâne 'pending' și pleacă la următoarea rundă
          if (cur.client_updated_at === r.client_updated_at) cur.sync_status = status;
        });
    }
  });
  if (error) throw error;
}

async function pushProfile(client: SupabaseClient, userId: string): Promise<void> {
  const local = await db.profiles.get(userId);
  if (!local || local.sync_status === 'synced') return;

  const { error } = await client.from('user_profiles').upsert(
    {
      id: local.user_id,
      full_name: local.full_name,
      training_split: local.training_split,
      nutrition_phase: local.nutrition_phase,
      spine_hygiene_alert: local.spine_hygiene_alert,
      sex: local.sex,
      birth_year: local.birth_year,
      height_cm: local.height_cm,
      activity_level: local.activity_level,
      kcal_target_override: local.kcal_target_override,
      long_term_focus: local.long_term_focus,
      long_term_also: local.long_term_also ?? [],
      effort_scale: local.effort_scale ?? 'rir',
      week_starts_on: local.week_starts_on ?? 'monday',
      favorite_exercise_ids: local.favorite_exercise_ids ?? [],
      week_slots: local.week_slots ?? {},
      week_moves: local.week_moves ?? [],
      client_updated_at: local.client_updated_at,
    },
    { onConflict: 'id' },
  );

  const status: SyncStatus = error ? (isRejected(error) ? 'error' : 'pending') : 'synced';
  await db.profiles
    .where('user_id')
    .equals(userId)
    .modify((cur) => {
      if (cur.client_updated_at === local.client_updated_at) cur.sync_status = status;
    });
  if (error) throw error;
}

// ------------------------------------------------------------------ aducere

interface RemoteProfile {
  id: string;
  full_name: string;
  training_split: TrainingSplit;
  nutrition_phase: NutritionPhase;
  spine_hygiene_alert: boolean;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  kcal_target_override: number | null;
  long_term_focus?: LongTermFocus | null;
  long_term_also?: LongTermFocus[] | null;
  effort_scale?: EffortScale | null;
  week_starts_on?: WeekStartsOn | null;
  favorite_exercise_ids?: string[] | null;
  week_slots?: Partial<Record<IsoWeekday, string>> | null;
  week_moves?: WeekMove[] | null;
  client_updated_at: string;
}

function isSlotMap(value: unknown): value is Partial<Record<IsoWeekday, string>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, id]) => ['1', '2', '3', '4', '5', '6', '7'].includes(key) && typeof id === 'string');
}

function isWeekMove(value: unknown): value is WeekMove {
  if (!value || typeof value !== 'object') return false;
  const row = value as WeekMove;
  return (
    typeof row.id === 'string' &&
    typeof row.week_of === 'string' &&
    typeof row.from_date === 'string' &&
    typeof row.to_date === 'string' &&
    typeof row.routine_id === 'string'
  );
}

/** Ține minte până unde am ajuns cu aducerea, separat pe tabel și utilizator. */
const cursorKey = (userId: string, table: string): string => `corefit_pull_${userId}_${table}`;

/** Modificarea locală netrimisă și mai nouă decât cea de pe server rămâne neatinsă. */
function localWins(
  local: { sync_status: SyncStatus; client_updated_at: string } | undefined,
  remoteUpdatedAt: string,
): boolean {
  return (
    local !== undefined &&
    local.sync_status !== 'synced' &&
    Date.parse(local.client_updated_at) >= Date.parse(remoteUpdatedAt)
  );
}

function fromRemote(raw: Record<string, unknown>, dropId: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'created_at' || key === 'updated_at') continue;
    if (key === 'id' && dropId) continue;
    out[key] = typeof value === 'string' && key.endsWith('_at') ? toIso(value) : value;
  }
  out.sync_status = 'synced';
  return out;
}

async function pullSpec(client: SupabaseClient, spec: SyncSpec, userId: string): Promise<void> {
  const key = cursorKey(userId, spec.remote);
  const since = localStorage.getItem(key) ?? EPOCH;
  let newest = since;
  let offset = 0;

  for (;;) {
    const { data, error } = await client
      .from(spec.remote)
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', since)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = (data ?? []) as Array<Record<string, unknown> & { updated_at: string }>;
    if (rows.length > 0) {
      await db.transaction('rw', spec.table, async () => {
        for (const raw of rows) {
          const mapped = fromRemote(raw, spec.dropRemoteId);
          const local = await spec.table.get(spec.keyOf(mapped));
          if (localWins(local, String(mapped.client_updated_at))) continue;
          await spec.table.put(mapped);
        }
      });
      for (const r of rows) if (r.updated_at > newest) newest = r.updated_at;
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  localStorage.setItem(key, newest);
}

async function pullProfile(client: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await client.from('user_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return;

  const remote = data as RemoteProfile;
  const local = await db.profiles.get(userId);
  if (localWins(local, remote.client_updated_at)) return;

  const next: LocalProfile = {
    user_id: userId,
    full_name: remote.full_name,
    training_split: remote.training_split,
    nutrition_phase: remote.nutrition_phase,
    spine_hygiene_alert: remote.spine_hygiene_alert,
    sex: remote.sex,
    birth_year: remote.birth_year,
    height_cm: remote.height_cm,
    activity_level: remote.activity_level,
    kcal_target_override: remote.kcal_target_override,
    meal_plan: local?.meal_plan ?? 'standard',
    long_term_focus:
      remote.long_term_focus === undefined
        ? (local?.long_term_focus ?? null)
        : isFocus(remote.long_term_focus)
          ? remote.long_term_focus
          : null,
    long_term_also:
      remote.long_term_also === undefined
        ? (local?.long_term_also ?? [])
        : Array.isArray(remote.long_term_also)
          ? remote.long_term_also.filter(isFocus)
          : [],
    effort_scale: remote.effort_scale === 'rpe' || remote.effort_scale === 'rir' ? remote.effort_scale : (local?.effort_scale ?? 'rir'),
    week_starts_on:
      remote.week_starts_on === 'sunday' || remote.week_starts_on === 'monday'
        ? remote.week_starts_on
        : (local?.week_starts_on ?? 'monday'),
    favorite_exercise_ids:
      remote.favorite_exercise_ids === undefined
        ? (local?.favorite_exercise_ids ?? [])
        : Array.isArray(remote.favorite_exercise_ids)
          ? remote.favorite_exercise_ids.filter((id): id is string => typeof id === 'string')
          : [],
    week_slots: remote.week_slots === undefined ? (local?.week_slots ?? {}) : isSlotMap(remote.week_slots) ? remote.week_slots : {},
    week_moves:
      remote.week_moves === undefined ? (local?.week_moves ?? []) : Array.isArray(remote.week_moves) ? remote.week_moves.filter(isWeekMove) : [],
    client_updated_at: toIso(remote.client_updated_at),
    sync_status: 'synced',
  };
  await db.profiles.put(next);
}

// ------------------------------------------------------------------ orchestrare

/**
 * Rulează toate etapele; o etapă eșuată nu le blochează pe celelalte.
 * Returnează mesajele de eroare unice (listă goală = totul a mers).
 */
export async function syncAll(client: SupabaseClient, userId: string): Promise<string[]> {
  const stages: Array<() => Promise<void>> = [
    () => pushProfile(client, userId),
    ...SPECS.map((spec) => () => pushSpec(client, spec, userId)),
    () => pullProfile(client, userId),
    ...SPECS.map((spec) => () => pullSpec(client, spec, userId)),
  ];

  const errors = new Set<string>();
  for (const stage of stages) {
    try {
      await stage();
    } catch (e) {
      errors.add(describeError(e));
    }
  }
  return [...errors];
}
