import Dexie from 'dexie';
import { builtinExercise, type Exercise, type ExerciseKind } from '../data/exercises';
import {
  db,
  newId,
  nowIso,
  stamp,
  type LocalRoutine,
  type LocalWorkoutLog,
  type LocalWorkoutSession,
  type RoutineExercise,
  type EffortScale,
} from './db';
import { DEFAULT_PROGRESSION, STALL_SESSIONS, suggestNextSets, type ProgressionRule } from './progression';
import {
  detectRecords,
  findExercise,
  sessionMinutes,
  setVolume,
  type PersonalRecord,
} from './workoutStats';

// ------------------------------------------------------------------ schița antrenamentului în curs

export interface DraftSet {
  key: string;
  kind: 'work' | 'warmup';
  weight: string;
  reps: string;
  /** gol = efortul nu e notat */
  effort: string;
  done: boolean;
  log_id: string | null;
}

export interface DraftExercise {
  exercise_id: string;
  rest_s: number;
  sets: DraftSet[];
  /** explicația sugestiei de progresie pentru acest exercițiu, dacă s-a aplicat una */
  progressionNote: string | null;
  /** true = formează un superset cu exercițiul următor din listă (fără pauză între ele) */
  linkedToNext: boolean;
}

export interface Draft {
  exercises: DraftExercise[];
  /** antrenament notat ulterior: se încheie la această oră, nu la apăsarea "Termină" */
  backfill?: { endedAt: string };
}

const draftKey = (sessionId: string): string => `corefit_draft_${sessionId}`;

/** Schița rămâne pe dispozitiv (nu se sincronizează): seriile bifate sunt cele care contează. */
export function loadDraft(sessionId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(sessionId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(sessionId: string, draft: Draft): void {
  try {
    localStorage.setItem(draftKey(sessionId), JSON.stringify(draft));
  } catch {
    /* fără stocare, schița se pierde doar la reîncărcare */
  }
}

export function clearDraft(sessionId: string): void {
  try {
    localStorage.removeItem(draftKey(sessionId));
  } catch {
    /* nimic de făcut */
  }
}

// ------------------------------------------------------------------ interogări

/** Seriile din ultima sesiune în care ai făcut exercițiul (fără sesiunea curentă), indiferent de deload. */
export async function previousSets(
  userId: string,
  exerciseId: string,
  excludeSessionId: string | null,
): Promise<LocalWorkoutLog[]> {
  const recent = await db.workoutLogs
    .where('[user_id+logged_at]')
    .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
    .reverse()
    .filter(
      (l) =>
        !l.deleted &&
        l.exercise_id === exerciseId &&
        l.set_type === 'work' &&
        l.session_id !== excludeSessionId,
    )
    .limit(40)
    .toArray();
  if (recent.length === 0) return [];
  const sessionId = recent[0].session_id;
  return recent.filter((l) => l.session_id === sessionId).sort((a, b) => a.set_order - b.set_order);
}

/**
 * Ca `previousSets`, dar sare peste sesiunile de deload: acelea nu trebuie să tragă
 * progresia automată în jos. Folosită doar pentru calculul sugestiei, nu pentru afișare.
 */
export async function previousNonDeloadSets(
  userId: string,
  exerciseId: string,
  excludeSessionId: string | null,
): Promise<LocalWorkoutLog[]> {
  return (await recentNonDeloadSessions(userId, exerciseId, excludeSessionId, 1))[0] ?? [];
}

/** Ultimele `count` sesiuni (fără deload) cu exercițiul, cea mai recentă prima. */
export async function recentNonDeloadSessions(
  userId: string,
  exerciseId: string,
  excludeSessionId: string | null,
  count: number,
): Promise<LocalWorkoutLog[][]> {
  const recent = await db.workoutLogs
    .where('[user_id+logged_at]')
    .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
    .reverse()
    .filter(
      (l) =>
        !l.deleted &&
        l.exercise_id === exerciseId &&
        l.set_type === 'work' &&
        l.session_id !== excludeSessionId,
    )
    .limit(200)
    .toArray();
  if (recent.length === 0) return [];
  const sessions: LocalWorkoutLog[][] = [];

  const bySession = new Map<string, LocalWorkoutLog[]>();
  const order: string[] = [];
  for (const l of recent) {
    const sid = l.session_id as string;
    if (!bySession.has(sid)) {
      bySession.set(sid, []);
      order.push(sid);
    }
    bySession.get(sid)?.push(l);
  }
  for (const sid of order) {
    const session = await db.workoutSessions.get(sid);
    if (session && !session.deleted && !session.is_deload) {
      sessions.push((bySession.get(sid) ?? []).sort((a, b) => a.set_order - b.set_order));
      if (sessions.length >= count) break;
    }
  }
  return sessions;
}

async function exerciseKindOf(exerciseId: string): Promise<ExerciseKind> {
  const built = builtinExercise(exerciseId);
  if (built) return built.kind;
  const custom = await db.customExercises.get(exerciseId);
  return custom?.kind ?? 'reps';
}

/** Regula efectivă pentru un exercițiu: override-ul lui, sau regula implicită a rutinei. */
export function resolveProgression(routine: LocalRoutine | null, spec: RoutineExercise): ProgressionRule {
  if (!routine) return DEFAULT_PROGRESSION;
  return {
    kind: spec.progression ?? routine.default_progression,
    incrementKg: routine.progression_increment_kg,
    resetPct: routine.progression_reset_pct,
  };
}

export const DEFAULT_REST_S = 90;

export async function buildDraftExercise(
  userId: string,
  spec: RoutineExercise,
  sessionId: string,
  rule: ProgressionRule = DEFAULT_PROGRESSION,
): Promise<DraftExercise> {
  let target: Array<{ weight_kg: number; reps: number }>;
  let note: string | null = null;
  let setCount = Math.max(1, spec.sets);

  if (rule.kind === 'none') {
    target = await previousSets(userId, spec.exercise_id, sessionId);
  } else {
    const [previous = [], ...older] = await recentNonDeloadSessions(userId, spec.exercise_id, sessionId, STALL_SESSIONS);
    if (previous.length === 0) {
      target = [];
    } else {
      const kind = await exerciseKindOf(spec.exercise_id);
      const toPast = (logs: LocalWorkoutLog[]) => logs.map((p) => ({ weight_kg: p.weight_kg, reps: p.reps }));
      const suggestion = suggestNextSets(rule, kind, spec.rep_min, spec.rep_max, toPast(previous), {
        history: older.map(toPast),
      });
      target = suggestion.sets.map((s) => ({ weight_kg: s.weight, reps: s.reps }));
      note = suggestion.note || null;
      if (suggestion.setCount) setCount = Math.max(setCount, suggestion.setCount);
    }
  }

  const sets: DraftSet[] = Array.from({ length: setCount }, (_, i) => {
    const p = target[i] ?? target[target.length - 1];
    return {
      key: newId(),
      kind: 'work',
      weight: p && p.weight_kg > 0 ? String(p.weight_kg).replace('.', ',') : '',
      reps: p ? String(p.reps) : String(spec.rep_min),
      effort: '',
      done: false,
      log_id: null,
    };
  });
  return { exercise_id: spec.exercise_id, rest_s: spec.rest_s || DEFAULT_REST_S, sets, progressionNote: note, linkedToNext: spec.linked_to_next ?? false };
}

// ------------------------------------------------------------------ sesiuni

export async function startSession(
  userId: string,
  name: string,
  routine: LocalRoutine | null,
  /** pentru un antrenament notat ulterior: începutul și sfârșitul lui real */
  past?: { startedAt: string; endedAt: string },
): Promise<string> {
  const id = newId();
  await db.workoutSessions.put({
    id,
    user_id: userId,
    kind: 'strength',
    name,
    routine_id: routine?.id ?? null,
    activity: null,
    intensity: null,
    started_at: past?.startedAt ?? nowIso(),
    ended_at: null,
    notes: '',
    is_deload: routine?.is_deload ?? false,
    deleted: false,
    ...stamp(),
  });

  const exercises: DraftExercise[] = [];
  for (const spec of routine?.exercises ?? []) {
    exercises.push(await buildDraftExercise(userId, spec, id, resolveProgression(routine, spec)));
  }
  saveDraft(id, past ? { exercises, backfill: { endedAt: past.endedAt } } : { exercises });
  return id;
}

export async function saveSet(
  userId: string,
  sessionId: string,
  exercise: Exercise,
  set: DraftSet,
  order: number,
  weightKg: number,
  reps: number,
  effort: { value: number | null; scale: EffortScale | null } = { value: null, scale: null },
  /** implicit acum; un antrenament notat ulterior își dă propriile momente, în trecut */
  loggedAt: string = nowIso(),
): Promise<string> {
  const id = set.log_id ?? newId();
  await db.workoutLogs.put({
    id,
    user_id: userId,
    session_id: sessionId,
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    set_type: set.kind,
    set_order: order,
    weight_kg: weightKg,
    reps,
    rpe: effort.value,
    effort_scale: effort.value === null ? null : effort.scale,
    pain_detected: false,
    logged_at: loggedAt,
    deleted: false,
    ...stamp(),
  });
  return id;
}

export async function removeSet(logId: string): Promise<void> {
  await db.workoutLogs.update(logId, { deleted: true, ...stamp() });
}

export async function editSetValues(
  logId: string,
  weightKg: number,
  reps: number,
  effort?: { value: number | null; scale: EffortScale | null },
): Promise<void> {
  await db.workoutLogs.update(logId, {
    weight_kg: weightKg,
    reps,
    ...(effort ? { rpe: effort.value, effort_scale: effort.value === null ? null : effort.scale } : {}),
    ...stamp(),
  });
}

export async function finishSession(sessionId: string, notes: string, endedAt: string = nowIso()): Promise<void> {
  await db.workoutSessions.update(sessionId, { ended_at: endedAt, notes, ...stamp() });
  clearDraft(sessionId);
}

/** Șterge (soft) o sesiune și toate seriile ei. */
export async function deleteSession(sessionId: string): Promise<void> {
  const stampNow = stamp();
  await db.transaction('rw', db.workoutSessions, db.workoutLogs, async () => {
    await db.workoutSessions.update(sessionId, { deleted: true, ...stampNow });
    await db.workoutLogs
      .where('session_id')
      .equals(sessionId)
      .modify((l) => {
        l.deleted = true;
        l.client_updated_at = stampNow.client_updated_at;
        l.sync_status = 'pending';
      });
  });
  clearDraft(sessionId);
}

export async function logCardio(
  userId: string,
  activity: string,
  minutes: number,
  intensity: 'moderate' | 'vigorous',
): Promise<void> {
  const end = Date.now();
  await db.workoutSessions.put({
    id: newId(),
    user_id: userId,
    kind: 'cardio',
    name: activity,
    routine_id: null,
    activity,
    intensity,
    started_at: new Date(end - minutes * 60_000).toISOString(),
    ended_at: new Date(end).toISOString(),
    notes: '',
    is_deload: false,
    deleted: false,
    ...stamp(),
  });
}

// ------------------------------------------------------------------ rezumat

export interface SessionSummary {
  name: string;
  minutes: number;
  workSets: number;
  volumeKg: number;
  records: PersonalRecord[];
}

export async function computeSummary(
  userId: string,
  session: LocalWorkoutSession,
  catalog: Map<string, Exercise>,
  endedAt: string = nowIso(),
): Promise<SessionSummary> {
  const sets = await db.workoutLogs
    .where('session_id')
    .equals(session.id)
    .filter((l) => !l.deleted)
    .toArray();
  // Toate celelalte serii, nu doar cele de dinainte: un antrenament notat ulterior nu e record
  // dacă un antrenament făcut după el l-a depășit deja.
  const earlier = await db.workoutLogs
    .where('[user_id+logged_at]')
    .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
    .filter((l) => !l.deleted && l.session_id !== session.id)
    .toArray();

  const work = sets.filter((l) => l.set_type === 'work');
  const volumeKg = work.reduce(
    (sum, l) => sum + setVolume(findExercise(catalog, l.exercise_id, l.exercise_name).kind, l.weight_kg, l.reps),
    0,
  );
  const finished = { ...session, ended_at: endedAt };
  return {
    name: session.name,
    minutes: sessionMinutes(finished),
    workSets: work.length,
    volumeKg,
    records: detectRecords(sets, earlier, catalog),
  };
}
