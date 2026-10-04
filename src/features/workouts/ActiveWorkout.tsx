import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Clock, History, Link2, Minus, Play, Plus, Square, Trash2, TrendingUp, Unlink } from 'lucide-react';
import { type Exercise } from '../../data/exercises';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useNow } from '../../hooks/useNow';
import { saveProfilePatch, type LocalWorkoutSession } from '../../lib/db';
import { cx } from '../../lib/cx';
import { formatEffort, parseEffort, RIR_OPTIONS, RPE_OPTIONS } from '../../lib/effort';
import { formatDateTime } from '../../lib/date';
import { formatNum, parseDecimal } from '../../lib/numbers';
import {
  backfillLoggedAt,
  compactSets,
  heldSeconds,
  nextPendingSet,
  removeExerciseAt,
  restAfterSet,
  setNumber,
  setProgress,
  targetLabel,
  toggleSupersetWithNext,
} from '../../lib/sessionEdit';
import { askRestAlertPermission, restAlertPermission, scheduleRestAlert } from '../../lib/restAlert';
import { nextSetType, SET_TYPE_LABELS, SET_TYPE_MARK } from '../../lib/setTypes';
import { findExercise, groupLinked } from '../../lib/workoutStats';
import {
  buildDraftExercise,
  clearDraft,
  computeSummary,
  DEFAULT_REST_S,
  deleteSession,
  editSetValues,
  finishSession,
  loadDraft,
  previousSets,
  removeSet,
  saveDraft,
  saveSet,
  type Draft,
  type DraftExercise,
  type DraftSet,
  type SessionSummary,
} from '../../lib/workoutOps';
import { newId } from '../../lib/db';
import { Notice } from '../../components/ui';
import { ExerciseFigure } from '../../components/ExerciseFigure';
import { ExerciseHistory } from './ExerciseHistory';
import { ExercisePicker } from './ExercisePicker';

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ro-RO';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

function buzz(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* vibrația nu e disponibilă peste tot */
  }
}

interface Props {
  session: LocalWorkoutSession;
  onFinished: (summary: SessionSummary) => void;
}

export function ActiveWorkout({ session, onFinished }: Props) {
  const { userId, profile, goTo, setImmersive } = useApp();
  const catalog = useCatalog(userId);
  const now = useNow(500);
  const scale = profile?.effort_scale === 'rpe' ? 'rpe' : 'rir';

  const [draft, setDraft] = useState<Draft>(() => loadDraft(session.id) ?? { exercises: [] });
  const [notes, setNotes] = useState(session.notes);
  const [rest, setRest] = useState<{ endsAt: number; total: number; fiveSecWarned?: boolean } | null>(null);
  /** ecranul mare al pauzei; „Înapoi la serii” îl închide, pauza merge mai departe în banda de jos */
  const [restOpen, setRestOpen] = useState(false);
  const [alerts, setAlerts] = useState(restAlertPermission);
  const [picker, setPicker] = useState(false);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** cronometrul de lucru pentru o serie cronometrată (plank, wall sit) */
  const [work, setWork] = useState<{ exIndex: number; key: string; startedAt: number; cued: boolean } | null>(null);
  const backfill = draft.backfill ?? null;

  useEffect(() => saveDraft(session.id, draft), [session.id, draft]);

  // antrenamentul ocupă tot ecranul: fără bara de jos în tabul Antrenament
  useEffect(() => {
    setImmersive('workouts', true);
    return () => setImmersive('workouts', false);
  }, [setImmersive]);

  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } };
    if (!nav.wakeLock) return;
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const ask = () => {
      void nav.wakeLock?.request('screen').then(
        (next) => {
          if (gone) void next.release();
          else lock = next;
        },
        () => undefined,
      );
    };
    ask();
    const onVis = () => {
      if (document.visibilityState === 'visible') ask();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, []);

  // seriile de la ultima sesiune, ca să le arătăm lângă fiecare exercițiu
  const exerciseIds = draft.exercises.map((e) => e.exercise_id).join(',');
  const { data: previousByExercise } = useLive(async () => {
    const entries = await Promise.all(
      exerciseIds
        .split(',')
        .filter(Boolean)
        .map(async (id) => [id, await previousSets(userId, id, session.id)] as const),
    );
    return new Map(entries);
  }, [userId, session.id, exerciseIds]);

  // sfârșitul pauzei
  useEffect(() => {
    if (rest) {
      const remaining = Math.round((rest.endsAt - now) / 1000);
      if (remaining === 5 && !rest.fiveSecWarned) {
        setRest((r) => r ? { ...r, fiveSecWarned: true } : r);
        speak("Pregătește-te. 5 secunde. Ia greutățile.");
      }
      if (remaining <= 0) {
        buzz();
        speak('Pauza s-a terminat.');
        setRest(null);
        setRestOpen(false);
      }
    }
  }, [now, rest]);

  // ținta seriei cronometrate atinsă: un semnal, cronometrul merge mai departe până la Stop
  useEffect(() => {
    if (!work || work.cued) return;
    const set = draft.exercises[work.exIndex]?.sets.find((s) => s.key === work.key);
    const target = set ? parseDecimal(set.reps) : null;
    if (target && heldSeconds(work.startedAt, now) >= target) {
      buzz();
      setWork((w) => (w ? { ...w, cued: true } : w));
    }
  }, [now, work, draft]);

  const elapsed = (now - Date.parse(session.started_at)) / 1000;
  const doneCount = useMemo(
    () => draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0),
    [draft],
  );

  const patchExercise = (index: number, fn: (e: DraftExercise) => DraftExercise) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === index ? fn(e) : e)) }));

  const patchSet = (exIndex: number, key: string, patch: Partial<DraftSet>) =>
    patchExercise(exIndex, (e) => ({ ...e, sets: e.sets.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  const exerciseOf = (e: DraftExercise): Exercise => findExercise(catalog, e.exercise_id);

  const readValues = (ex: Exercise, set: DraftSet): { weight: number; reps: number } | string => {
    const reps = parseDecimal(set.reps);
    if (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 999) {
      return ex.kind === 'duration' ? 'Scrie durata în secunde.' : 'Scrie numărul de repetări (un număr întreg).';
    }
    const weight = ex.kind === 'duration' ? 0 : (parseDecimal(set.weight) ?? 0);
    if (weight < 0 || weight > 999) return 'Greutatea trebuie să fie între 0 și 999 kg.';
    if (ex.kind === 'reps' && weight === 0) return 'Scrie greutatea (kg) pentru acest exercițiu.';
    return { weight, reps };
  };

  const toggleDone = async (exIndex: number, set: DraftSet) => {
    const draftEx = draft.exercises[exIndex];
    const ex = exerciseOf(draftEx);
    setError(null);

    if (set.done) {
      if (set.log_id) await removeSet(set.log_id);
      patchSet(exIndex, set.key, { done: false, log_id: null });
      return;
    }

    const values = readValues(ex, set);
    if (typeof values === 'string') return setError(values);

    try {
      const order = draftEx.sets.findIndex((s) => s.key === set.key);
      const logId = await saveSet(
        userId,
        session.id,
        ex,
        set,
        order,
        values.weight,
        values.reps,
        { value: parseEffort(set.effort ?? '', scale), scale },
        backfill ? backfillLoggedAt(session.started_at, doneCount) : undefined,
      );
      patchSet(exIndex, set.key, { done: true, log_id: logId });
      
      // Haptic feedback
      try { navigator.vibrate?.(50); } catch {}
      
      // un antrenament notat ulterior nu are pauze de cronometrat
      const total = set.kind === 'work' && !backfill ? restAfterSet(draft.exercises, exIndex) : null;
      if (total !== null) {
        setRest({ endsAt: Date.now() + total * 1000, total });
        setRestOpen(true);
      }
    } catch {
      setError('Seria nu s-a putut salva pe dispozitiv. Verifică spațiul de stocare.');
    }
  };

  const editValue = (exIndex: number, set: DraftSet, patch: Partial<Pick<DraftSet, 'weight' | 'reps' | 'effort'>>) => {
    const next = { ...set, ...patch };
    patchSet(exIndex, set.key, patch);
    if (set.done && set.log_id) {
      const values = readValues(exerciseOf(draft.exercises[exIndex]), next);
      if (typeof values !== 'string') {
        void editSetValues(set.log_id, values.weight, values.reps, {
          value: parseEffort(next.effort ?? '', scale),
          scale,
        });
      }
    }
  };

  /** Pornește cronometrul de lucru, sau îl oprește și bifează seria cu timpul ținut. */
  const toggleWork = (exIndex: number, set: DraftSet) => {
    if (work && work.exIndex === exIndex && work.key === set.key) {
      const held = String(heldSeconds(work.startedAt, Date.now()));
      setWork(null);
      patchSet(exIndex, set.key, { reps: held });
      void toggleDone(exIndex, { ...set, reps: held });
      return;
    }
    setError(null);
    setWork({ exIndex, key: set.key, startedAt: Date.now(), cued: false });
  };

  const changeRest = (exIndex: number, delta: number) =>
    patchExercise(exIndex, (e) => ({
      ...e,
      rest_s: Math.min(600, Math.max(0, (e.rest_s || DEFAULT_REST_S) + delta)),
    }));

  const toggleSuperset = (exIndex: number) =>
    setDraft((d) => ({ ...d, exercises: toggleSupersetWithNext(d.exercises, exIndex) }));

  const addSet = (exIndex: number) =>
    patchExercise(exIndex, (e) => {
      const last = e.sets[e.sets.length - 1];
      const copy: DraftSet = {
        key: newId(),
        kind: 'work',
        weight: last?.weight ?? '',
        reps: last?.reps ?? '',
        effort: '',
        done: false,
        log_id: null,
      };
      return { ...e, sets: [...e.sets, copy] };
    });

  const removeExercise = async (exIndex: number) => {
    const ex = draft.exercises[exIndex];
    if (!window.confirm(`Scoți ${exerciseOf(ex).name} din antrenament?`)) return;
    for (const s of ex.sets) if (s.log_id) await removeSet(s.log_id);
    setDraft((d) => ({ ...d, exercises: removeExerciseAt(d.exercises, exIndex) }));
    setWork(null);
  };

  const addExercise = async (exercise: Exercise) => {
    setPicker(false);
    const built = await buildDraftExercise(
      userId,
      { exercise_id: exercise.id, sets: 3, rep_min: 8, rep_max: 12, rest_s: DEFAULT_REST_S },
      session.id,
    );
    setDraft((d) => ({ ...d, exercises: [...d.exercises, built] }));
  };

  const finish = async () => {
    if (doneCount === 0) return setError('Bifează cel puțin o serie sau renunță la antrenament.');
    if (!window.confirm('Termini antrenamentul?')) return;
    await finishSession(session.id, notes.trim(), backfill?.endedAt);
    const summary = await computeSummary(userId, session, catalog, backfill?.endedAt);
    onFinished(summary);
  };

  const discard = async () => {
    if (!window.confirm('Renunți la acest antrenament? Seriile notate se șterg.')) return;
    await deleteSession(session.id);
    clearDraft(session.id);
  };

  const progress = setProgress(draft.exercises);
  const next = nextPendingSet(draft.exercises);
  const nextEx = next ? draft.exercises[next.exIndex] : null;
  const nextSet = next && nextEx ? nextEx.sets[next.setIndex] : null;
  const nextName = nextEx ? exerciseOf(nextEx).name : null;
  const nextNumber = next && nextEx ? setNumber(nextEx, next.setIndex) : null;
  const nextLabel = nextName ? `${nextName}${nextNumber ? `, setul ${nextNumber}` : ''}` : null;
  const restLeft = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;

  // anunț cu ecranul blocat la sfârșitul pauzei (dacă utilizatorul l-a permis)
  const restEndsAt = rest?.endsAt ?? null;
  useEffect(() => (restEndsAt ? scheduleRestAlert(restEndsAt, nextLabel) : undefined), [restEndsAt, nextLabel]);

  const loadOf = (ex: Exercise, set: DraftSet) =>
    ex.kind === 'duration' ? `${set.reps || '–'} s` : `${set.weight ? `${set.weight} kg` : 'corp'} × ${set.reps || '–'} rep.`;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-canvas/90 px-4 pb-1 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <button type="button" className="min-h-[44px] pr-3 text-[17px] font-semibold text-brand-fg" onClick={() => goTo('home')}>
          Închide
        </button>
        <span className="num flex items-center gap-1.5 text-[17px]">
          <Clock size={17} aria-hidden="true" />
          {backfill ? formatDateTime(session.started_at) : formatClock(elapsed)}
        </span>
        <button type="button" className="min-h-[44px] pl-3 text-[17px] font-semibold text-brand-fg" onClick={() => void finish()}>
          Termină
        </button>
      </div>

      <h1 className="mt-3 font-display text-[40px] font-extrabold leading-none tracking-tight">{session.name}</h1>
      <p className="mt-2 text-[17px] text-muted">
        {progress.done} din {progress.total} {progress.total === 1 ? 'serie' : 'serii'}
        {backfill ? ' · antrenament trecut' : ''}
      </p>
      {progress.total > 0 && progress.total <= 30 ? (
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {Array.from({ length: progress.total }, (_, i) => (
            <span key={i} className={cx('h-1 flex-1 rounded-full', i < progress.done ? 'bg-fg' : 'bg-fg/10')} />
          ))}
        </div>
      ) : progress.total > 30 ? (
        <div className="mt-3 h-1 rounded-full bg-fg/10" aria-hidden="true">
          <div className="h-full rounded-full bg-fg" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      ) : null}
      <button
        type="button"
        className="mt-2 min-h-[44px] self-start text-sm text-subtle"
        onClick={() => profile && void saveProfilePatch(userId, { effort_scale: scale === 'rir' ? 'rpe' : 'rir' })}
      >
        Efortul în {scale === 'rir' ? 'RIR (repetări în rezervă)' : 'RPE (1–10)'} · <span className="font-semibold text-brand-fg">schimbă</span>
      </button>

      {error && (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {draft.exercises.length === 0 && <p className="mt-6 text-[17px] text-muted">Adaugă primul exercițiu ca să începi să notezi serii.</p>}

      {groupLinked(draft.exercises, (de) => de.linkedToNext).map((idxs, gi) => (
        <div key={gi} className="border-t border-line">
          {idxs.length > 1 && (
            <p className="pt-4 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">
              Superset · {idxs.length} exerciții, fără pauză între ele
            </p>
          )}
          {idxs.map((exIndex, posInGroup) => {
            const de = draft.exercises[exIndex];
            const ex = exerciseOf(de);
            const previous = previousByExercise?.get(de.exercise_id) ?? [];
            const side = ex.perSide ? ' pe parte' : '';
            const unit = ex.kind === 'duration' ? 's' : 'rep.';
            return (
              <section key={`${de.exercise_id}-${exIndex}`} className={cx('pb-3 pt-4', posInGroup > 0 && 'border-t border-line/60')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[20px] font-bold leading-tight tracking-tight">{ex.name}</h2>
                    <p className="mt-0.5 text-[15px] text-subtle">{targetLabel(de, de.rest_s || DEFAULT_REST_S)}</p>
                  </div>
                  <ExerciseFigure exerciseId={ex.id} name={ex.name} />
                </div>
                {previous.length > 0 && (
                  <p className="mt-1.5 text-sm text-muted">
                    Ultima dată:{' '}
                    {compactSets(
                      previous.map((p) => {
                        const load =
                          ex.kind === 'duration'
                            ? `${p.reps} s${side}`
                            : `${p.weight_kg > 0 ? formatNum(p.weight_kg, 2) : 'corp'} × ${p.reps}${side}`;
                        const effort = formatEffort(p.rpe, p.effort_scale);
                        return effort ? `${load} ${effort}` : load;
                      }),
                    )}
                  </p>
                )}

                <ul className="mt-1">
                  {de.sets.map((s, i) => {
                    const current = next?.exIndex === exIndex && next.setIndex === i;
                    const n = setNumber(de, i);
                    const running = work?.exIndex === exIndex && work.key === s.key;
                    return (
                      <li key={s.key} className="border-b border-line/70 last:border-b-0">
                        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_1.5rem_minmax(0,1fr)_2.5rem_2.75rem] items-center gap-1 py-1.5">
                          <button
                            type="button"
                            onClick={() => patchSet(exIndex, s.key, { kind: nextSetType(s.kind) })}
                            disabled={s.done}
                            aria-label={`Seria ${i + 1}: ${SET_TYPE_LABELS[s.kind]}. Apasă ca să schimbi tipul.`}
                            className={cx('flex h-11 items-center text-[15px] font-bold', current ? 'text-brand-fg' : 'text-subtle')}
                          >
                            {n ?? SET_TYPE_MARK[s.kind as 'warmup' | 'drop' | 'failure']}
                          </button>
                          {ex.kind === 'duration' ? (
                            <button
                              type="button"
                              disabled={s.done || (work !== null && !running)}
                              onClick={() => toggleWork(exIndex, s)}
                              aria-label={running ? 'Oprește cronometrul și notează timpul' : 'Pornește cronometrul seriei'}
                              className={cx(
                                'col-span-2 flex h-11 items-center justify-center gap-1 rounded-xl text-[17px] font-bold tabular-nums',
                                running ? 'bg-brand text-on-brand' : 'bg-raised text-fg disabled:opacity-40',
                              )}
                            >
                              {running ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                              {running ? `${heldSeconds(work.startedAt, now)} s` : 'Start'}
                            </button>
                          ) : (
                            <>
                              <input
                                className={cx(
                                  'num h-11 w-full min-w-0 rounded-xl bg-transparent px-1 text-[24px] outline-none',
                                  current ? 'text-center ring-2 ring-brand' : 'text-left',
                                  !s.done && !current && 'text-fg/80',
                                )}
                                inputMode="decimal"
                                value={s.weight}
                                placeholder={ex.kind === 'bodyweight' ? '0' : '–'}
                                aria-label={`Greutate, seria ${i + 1}`}
                                onChange={(e) => editValue(exIndex, s, { weight: e.target.value })}
                              />
                              <span className="text-[13px] font-semibold text-subtle">{ex.kind === 'bodyweight' ? '+ kg' : 'kg'}</span>
                            </>
                          )}
                          <span className="text-center text-subtle">×</span>
                          <input
                            className={cx(
                              'num h-11 w-full min-w-0 rounded-xl bg-transparent px-1 text-[24px] outline-none',
                              current ? 'text-center ring-2 ring-brand' : 'text-left',
                              !s.done && !current && 'text-fg/80',
                            )}
                            inputMode="numeric"
                            value={s.reps}
                            placeholder="–"
                            aria-label={`${ex.kind === 'duration' ? 'Secunde' : 'Repetări'}, seria ${i + 1}`}
                            onChange={(e) => editValue(exIndex, s, { reps: e.target.value })}
                          />
                          <span className="text-[13px] font-semibold text-subtle">{unit}</span>
                          <button
                            type="button"
                            onClick={() => void toggleDone(exIndex, s)}
                            aria-pressed={s.done}
                            aria-label={s.done ? 'Anulează seria' : 'Bifează seria'}
                            className={cx(
                              'flex h-11 w-11 items-center justify-center rounded-full',
                              s.done ? 'bg-fg text-canvas' : 'border-[1.5px] border-line-strong/80 text-transparent',
                            )}
                          >
                            <Check size={20} strokeWidth={3} aria-hidden="true" />
                          </button>
                        </div>
                        {current && !s.done && (
                          <div className="flex flex-wrap items-center gap-1.5 pb-2.5 pl-9">
                            <span className="mr-1 text-[13px] text-subtle">{scale === 'rir' ? 'RIR' : 'RPE'}</span>
                            {(scale === 'rir' ? RIR_OPTIONS : RPE_OPTIONS).map((option) => {
                              const selected = (s.effort ?? '') === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  aria-pressed={selected}
                                  className={cx(
                                    'h-9 min-w-[2.25rem] rounded-full px-2 text-sm font-semibold',
                                    selected ? 'bg-fg text-canvas' : 'bg-raised text-fg',
                                  )}
                                  onClick={() => editValue(exIndex, s, { effort: selected ? '' : option })}
                                >
                                  {scale === 'rir' && option === '4' ? '4+' : option}
                                </button>
                              );
                            })}
                            {s.kind !== 'work' && <span className="ml-1 text-[13px] text-subtle">{SET_TYPE_LABELS[s.kind]}</span>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {de.progressionNote && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                    <TrendingUp size={16} aria-hidden="true" />
                    {de.progressionNote}
                  </p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button type="button" className="flex h-11 items-center gap-1.5 rounded-full bg-raised px-4 text-[15px] font-semibold" onClick={() => addSet(exIndex)}>
                    <Plus size={16} aria-hidden="true" />
                    Set
                  </button>
                  {!backfill && (
                    <span className="flex h-11 items-center rounded-full bg-raised text-[15px] font-semibold">
                      <button type="button" className="flex h-11 w-10 items-center justify-center" aria-label={`Pauză mai scurtă la ${ex.name}`} onClick={() => changeRest(exIndex, -15)}>
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <span className="num min-w-[3.5rem] text-center text-[15px]">{formatClock(de.rest_s || DEFAULT_REST_S)}</span>
                      <button type="button" className="flex h-11 w-10 items-center justify-center" aria-label={`Pauză mai lungă la ${ex.name}`} onClick={() => changeRest(exIndex, 15)}>
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </span>
                  )}
                  {exIndex < draft.exercises.length - 1 && (
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-raised"
                      aria-pressed={de.linkedToNext}
                      aria-label={de.linkedToNext ? 'Desface supersetul' : 'Superset cu următorul'}
                      onClick={() => toggleSuperset(exIndex)}
                    >
                      {de.linkedToNext ? <Unlink size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className={cx('flex h-11 w-11 items-center justify-center rounded-full', historyFor === exIndex ? 'bg-fg text-canvas' : 'bg-raised')}
                    aria-pressed={historyFor === exIndex}
                    aria-label="Istoric și progres"
                    onClick={() => setHistoryFor(historyFor === exIndex ? null : exIndex)}
                  >
                    <History size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeExercise(exIndex)}
                    aria-label={`Scoate ${ex.name}`}
                    className="ml-auto flex h-11 w-11 items-center justify-center text-subtle active:text-danger"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
                {historyFor === exIndex && (
                  <div className="mt-2">
                    <ExerciseHistory exercise={ex} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ))}

      <button type="button" className="btn-quiet mt-2 w-full" onClick={() => setPicker(true)}>
        <Plus size={18} aria-hidden="true" />
        Adaugă exercițiu
      </button>

      <div className="mt-6">
        <label htmlFor="workout-notes" className="label">
          Note despre antrenament
        </label>
        <textarea id="workout-notes" rows={2} className="field py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button type="button" className="btn-danger mt-4" onClick={() => void discard()}>
        Renunță la antrenament
      </button>

      {/* Banda de jos: pauza în curs, sau seria care urmează cu „Set gata” */}
      {(rest || (nextSet && nextEx)) && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-line bg-canvas/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {rest ? (
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setRestOpen(true)} aria-label="Deschide pauza">
                <span className="block text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Pauză</span>
                <span className="flex items-baseline gap-2">
                  <span className="num text-[28px] leading-none">{formatClock(restLeft)}</span>
                  {nextLabel && <span className="truncate text-sm text-subtle">· apoi {nextLabel}</span>}
                </span>
              </button>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Urmează</span>
                <span className="block truncate text-[15px] font-semibold">{nextLabel}</span>
                {nextEx && nextSet && <span className="block text-sm text-muted">{loadOf(exerciseOf(nextEx), nextSet)}</span>}
              </div>
            )}
            {rest ? (
              <button type="button" className="btn-quiet px-5" onClick={() => { setRest(null); setRestOpen(false); }}>
                Sari
              </button>
            ) : (
              nextEx &&
              nextSet &&
              exerciseOf(nextEx).kind !== 'duration' && (
                <button type="button" className="btn-primary px-5" onClick={() => void toggleDone(next!.exIndex, nextSet)}>
                  Set gata
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Ecranul mare al pauzei */}
      {rest && restOpen && (
        <div role="timer" aria-live="off" className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col bg-canvas px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between">
            <button type="button" className="min-h-[44px] pr-3 text-[17px] font-semibold text-brand-fg" onClick={() => setRestOpen(false)}>
              Înapoi la serii
            </button>
            <span className="num flex items-center gap-1.5 text-[17px]">
              <Clock size={17} aria-hidden="true" />
              {formatClock(elapsed)}
            </span>
            <span className="w-24" />
          </div>
          <p className="mt-6 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-subtle">Pauză</p>
          <div className="relative mx-auto mt-5 h-[17.5rem] w-[17.5rem]">
            <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="140" cy="140" r="135" fill="none" strokeWidth="10" className="stroke-fg/10" />
              <circle
                cx="140"
                cy="140"
                r="135"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className="stroke-fg"
                strokeDasharray={2 * Math.PI * 135}
                strokeDashoffset={2 * Math.PI * 135 * (1 - Math.max(0, Math.min(1, restLeft / rest.total)))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-[72px] leading-none">{formatClock(restLeft)}</span>
              <span className="mt-2 text-[17px] font-semibold text-subtle">din {formatClock(rest.total)}</span>
            </div>
          </div>
          {nextLabel && nextEx && nextSet && (
            <div className="mt-7 text-center">
              <p className="text-sm text-subtle">Urmează</p>
              <p className="mt-1 text-[22px] font-extrabold tracking-tight">{nextLabel}</p>
              <p className="text-muted">{loadOf(exerciseOf(nextEx), nextSet)}</p>
            </div>
          )}
          <div className="flex-1" />
          {alerts === 'default' && (
            <button
              type="button"
              className="mb-3 flex min-h-[44px] items-center justify-center gap-2 text-[15px] font-semibold text-brand-fg"
              onClick={() => void askRestAlertPermission().then(setAlerts)}
            >
              <Bell size={16} aria-hidden="true" />
              Anunță-mă și cu ecranul blocat
            </button>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" className="btn h-[52px] bg-fg/[0.08] text-[17px] text-fg active:bg-fg/[0.14]" onClick={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt - 15_000, total: Math.max(15, r.total - 15) } : r))}>
              −15 s
            </button>
            <button type="button" className="btn h-[52px] bg-fg/[0.08] text-[17px] text-fg active:bg-fg/[0.14]" onClick={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt + 15_000, total: r.total + 15 } : r))}>
              +15 s
            </button>
          </div>
          <button type="button" className="btn-primary mt-2.5 h-[52px] w-full text-[17px]" onClick={() => { setRest(null); setRestOpen(false); }}>
            Sari peste pauză
          </button>
        </div>
      )}

      {picker && <ExercisePicker onPick={(e) => void addExercise(e)} onClose={() => setPicker(false)} />}
    </div>
  );
}
