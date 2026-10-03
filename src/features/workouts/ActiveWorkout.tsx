import { useEffect, useMemo, useState } from 'react';
import { Check, Link2, Play, Plus, Square, Trash2, TrendingUp, Unlink } from 'lucide-react';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Exercise } from '../../data/exercises';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useNow } from '../../hooks/useNow';
import { saveProfilePatch, type LocalWorkoutSession } from '../../lib/db';
import { cx } from '../../lib/cx';
import { DOMAIN } from '../../lib/domains';
import { formatEffort, parseEffort, RIR_OPTIONS, RPE_OPTIONS } from '../../lib/effort';
import { formatDateTime } from '../../lib/date';
import { formatNum, parseDecimal } from '../../lib/numbers';
import {
  backfillLoggedAt,
  heldSeconds,
  removeExerciseAt,
  restAfterSet,
  toggleSupersetWithNext,
} from '../../lib/sessionEdit';
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

const D = DOMAIN.workouts;

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
  const { userId, profile } = useApp();
  const catalog = useCatalog(userId);
  const now = useNow(500);
  const scale = profile?.effort_scale === 'rpe' ? 'rpe' : 'rir';

  const [draft, setDraft] = useState<Draft>(() => loadDraft(session.id) ?? { exercises: [] });
  const [notes, setNotes] = useState(session.notes);
  const [rest, setRest] = useState<{ endsAt: number; total: number; fiveSecWarned?: boolean } | null>(null);
  const [picker, setPicker] = useState(false);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** cronometrul de lucru pentru o serie cronometrată (plank, wall sit) */
  const [work, setWork] = useState<{ exIndex: number; key: string; startedAt: number; cued: boolean } | null>(null);
  const backfill = draft.backfill ?? null;

  useEffect(() => saveDraft(session.id, draft), [session.id, draft]);

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
        setRest(null);
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
      if (total !== null) setRest({ endsAt: Date.now() + total * 1000, total });
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">{session.name}</h1>
          <p className="text-steel/70">
            {backfill
              ? `Antrenament trecut, ${formatDateTime(session.started_at)}. ${doneCount} serii notate.`
              : `${doneCount} serii notate, ${formatClock(elapsed)}`}
          </p>
          <button
            type="button"
            className="mt-1 text-sm font-semibold text-plate-red"
            onClick={() => profile && void saveProfilePatch(userId, { effort_scale: scale === 'rir' ? 'rpe' : 'rir' })}
          >
            Notezi efortul în {scale === 'rir' ? 'RIR' : 'RPE'}. Schimbă.
          </button>
        </div>
        <button type="button" className={`btn ${D.solid}`} onClick={() => void finish()}>
          Termină
        </button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {draft.exercises.length === 0 && (
        <Notice tone="info">Adaugă primul exercițiu ca să începi să notezi serii.</Notice>
      )}

      {(() => {
        const groups = groupLinked(draft.exercises, (de) => de.linkedToNext);
        return groups.map((idxs, gi) => (
          <div key={gi} className={idxs.length > 1 ? 'flex flex-col gap-0.5' : undefined}>
            {idxs.length > 1 && (
              <p className="px-1 pb-0.5 text-sm font-semibold text-plate-red">Superset, {idxs.length} exerciții, fără pauză între ele</p>
            )}
            {idxs.map((exIndex) => {
        const de = draft.exercises[exIndex];
        const ex = exerciseOf(de);
        const previous = previousByExercise?.get(de.exercise_id) ?? [];
        const unit = `${ex.kind === 'duration' ? 'sec' : 'rep'}${ex.perSide ? ' / parte' : ''}`;
        const side = ex.perSide ? ' pe parte' : '';
        const posInGroup = idxs.indexOf(exIndex);
        return (
          <section
            key={`${de.exercise_id}-${exIndex}`}
            className={cx(
              'panel border-l-4 p-3',
              D.edge,
              idxs.length > 1 && posInGroup < idxs.length - 1 && 'rounded-b-none border-b-0',
              idxs.length > 1 && posInGroup > 0 && 'rounded-t-none',
            )}
          >
            <div className="mb-2 flex items-start gap-3">
              <ExerciseFigure exerciseId={ex.id} name={ex.name} size="card" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl font-bold leading-tight">{ex.name}</h2>
                  <button
                    type="button"
                    onClick={() => void removeExercise(exIndex)}
                    aria-label={`Scoate ${ex.name}`}
                    className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-steel/50 active:text-plate-red"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-sm text-steel/60">
                  {MUSCLE_LABELS[ex.muscle]}, {EQUIPMENT_LABELS[ex.equipment]}
                </p>
                {previous.length > 0 && (
                  <p className="mt-1 text-sm text-steel/70">
                    Ultima dată:{' '}
                    {previous
                      .map((p) => {
                        const load =
                          ex.kind === 'duration'
                            ? `${p.reps} s${side}`
                            : `${p.weight_kg > 0 ? formatNum(p.weight_kg, 2) : 'corp'} x ${p.reps}${side}`;
                        const effort = formatEffort(p.rpe, p.effort_scale);
                        return effort ? `${load} ${effort}` : load;
                      })
                      .join(', ')}
                  </p>
                )}
                {de.progressionNote && (
                  <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-plate-red">
                    <TrendingUp size={14} aria-hidden="true" />
                    {de.progressionNote}
                  </p>
                )}
                <button type="button" className="mt-1 text-sm font-semibold underline" onClick={() => setHistoryFor(historyFor === exIndex ? null : exIndex)}>
                  {historyFor === exIndex ? 'Ascunde istoricul' : 'Istoric și progres'}
                </button>
                {historyFor === exIndex && <ExerciseHistory exercise={ex} />}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {!backfill && (
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        className="h-9 w-11 rounded-md bg-steel/10 font-semibold"
                        aria-label={`Pauză mai scurtă la ${ex.name}`}
                        onClick={() => changeRest(exIndex, -15)}
                      >
                        -15
                      </button>
                      <span className="min-w-[5.5rem] text-center tabular-nums">Pauză {de.rest_s || DEFAULT_REST_S} s</span>
                      <button
                        type="button"
                        className="h-9 w-11 rounded-md bg-steel/10 font-semibold"
                        aria-label={`Pauză mai lungă la ${ex.name}`}
                        onClick={() => changeRest(exIndex, 15)}
                      >
                        +15
                      </button>
                    </span>
                  )}
                  {exIndex < draft.exercises.length - 1 && (
                    <button
                      type="button"
                      className="flex h-9 items-center gap-1 rounded-md bg-steel/10 px-3 font-semibold"
                      aria-pressed={de.linkedToNext}
                      onClick={() => toggleSuperset(exIndex)}
                    >
                      {de.linkedToNext ? <Unlink size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                      {de.linkedToNext ? 'Desface supersetul' : 'Superset cu următorul'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[2.25rem_1fr_1fr_3rem] items-center gap-2 pb-1 text-sm text-steel/60">
              <span>Serie</span>
              <span>{ex.kind === 'duration' ? '' : ex.kind === 'bodyweight' ? '+ kg' : 'kg'}</span>
              <span>{unit}</span>
              <span className="sr-only">Gata</span>
            </div>

            <ul className="flex flex-col gap-2">
              {de.sets.map((s, i) => {
                const workNumber = de.sets.slice(0, i + 1).filter((x) => x.kind === 'work').length;
                return (
                  <li
                    key={s.key}
                    className={cx(
                      'grid grid-cols-[2.25rem_1fr_1fr_3rem] items-center gap-2 rounded-md',
                      s.done && 'bg-plate-green/10',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        patchSet(exIndex, s.key, { kind: s.kind === 'work' ? 'warmup' : 'work' })
                      }
                      disabled={s.done}
                      aria-label={s.kind === 'work' ? 'Marchează ca încălzire' : 'Marchează ca serie de lucru'}
                      className={cx(
                        'flex h-12 items-center justify-center font-display text-xl font-bold',
                        s.kind === 'warmup' ? 'text-plate-yellow' : 'text-steel',
                      )}
                    >
                      {s.kind === 'warmup' ? 'Î' : workNumber}
                    </button>
                    {ex.kind === 'duration' ? (
                      (() => {
                        const running = work?.exIndex === exIndex && work.key === s.key;
                        return (
                          <button
                            type="button"
                            disabled={s.done || (work !== null && !running)}
                            onClick={() => toggleWork(exIndex, s)}
                            aria-label={running ? 'Oprește cronometrul și notează timpul' : 'Pornește cronometrul seriei'}
                            className={cx(
                              'flex h-12 items-center justify-center gap-1 rounded-lg font-display text-lg font-bold tabular-nums',
                              running ? `${D.solid}` : 'bg-steel/10 text-steel disabled:opacity-40',
                            )}
                          >
                            {running ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                            {running ? `${heldSeconds(work.startedAt, now)} s` : 'Start'}
                          </button>
                        );
                      })()
                    ) : (
                      <input
                        className="field min-w-0 px-2 text-center font-display text-xl font-bold tabular-nums"
                        inputMode="decimal"
                        value={s.weight}
                        placeholder="0"
                        aria-label={`Greutate, seria ${i + 1}`}
                        onChange={(e) => editValue(exIndex, s, { weight: e.target.value })}
                      />
                    )}
                    <input
                      className="field min-w-0 px-2 text-center font-display text-xl font-bold tabular-nums"
                      inputMode="numeric"
                      value={s.reps}
                      placeholder="0"
                      aria-label={`${unit}, seria ${i + 1}`}
                      onChange={(e) => editValue(exIndex, s, { reps: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => void toggleDone(exIndex, s)}
                      aria-pressed={s.done}
                      aria-label={s.done ? 'Anulează seria' : 'Bifează seria'}
                      className={cx(
                        'flex h-12 w-12 items-center justify-center rounded-lg',
                        s.done ? 'bg-plate-green text-white' : 'bg-steel/10 text-steel/60 active:bg-steel/20',
                      )}
                    >
                      <Check size={22} />
                    </button>
                    <div className="col-span-4 flex flex-wrap gap-1">
                      {(scale === 'rir' ? RIR_OPTIONS : RPE_OPTIONS).map((option) => {
                        const selected = (s.effort ?? '') === option;
                        const label = scale === 'rir' && option === '4' ? '4+' : option;
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={selected}
                            className={cx('min-h-[40px] min-w-[40px] px-2 text-sm font-semibold', selected ? D.solid : 'bg-steel/10 text-steel')}
                            onClick={() => editValue(exIndex, s, { effort: selected ? '' : option })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button type="button" className="btn-quiet mt-3 w-full" onClick={() => addSet(exIndex)}>
              <Plus size={18} />
              Adaugă serie
            </button>
          </section>
        );
            })}
          </div>
        ));
      })()}

      <button type="button" className="btn-outline" onClick={() => setPicker(true)}>
        <Plus size={18} />
        Adaugă exercițiu
      </button>

      <div>
        <label htmlFor="workout-notes" className="label">
          Note despre antrenament
        </label>
        <textarea
          id="workout-notes"
          rows={2}
          className="field py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button type="button" className="btn-outline border-plate-red text-plate-red" onClick={() => void discard()}>
        Renunță la antrenament
      </button>

      {rest && (
        <div
          role="timer"
          aria-live="off"
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 bg-chalk/90 backdrop-blur-md px-6 text-white"
        >
          <div className="text-center">
            <h3 className="text-neon-mint font-semibold uppercase tracking-wider text-sm mb-1">Timp de recuperare</h3>
            <p className="text-white/60 text-sm">Pregătește-te pentru următoarea serie</p>
          </div>

          <div className="relative flex items-center justify-center w-64 h-64">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
              <circle 
                cx="128" cy="128" r="120" 
                stroke="currentColor" 
                strokeWidth="8" 
                fill="transparent" 
                className="text-neon-mint transition-all duration-1000 ease-linear"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - Math.max(0, Math.min(1, (rest.endsAt - now) / (rest.total * 1000))))}
              />
            </svg>
            <span className="num text-7xl font-bold tracking-tighter text-white shadow-neon-mint drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              {formatClock((rest.endsAt - now) / 1000)}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              type="button"
              className="btn-quiet h-12 w-16 text-lg text-white bg-white/5 border border-white/10 rounded-xl"
              onClick={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt - 15_000 } : r))}
            >
              -15s
            </button>
            <button 
              type="button" 
              className="btn-steel h-14 px-8 text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] rounded-2xl" 
              onClick={() => setRest(null)}
            >
              SARI PAUZA
            </button>
            <button
              type="button"
              className="btn-quiet h-12 w-16 text-lg text-white bg-white/5 border border-white/10 rounded-xl"
              onClick={() => setRest((r) => (r ? { ...r, endsAt: r.endsAt + 15_000, total: r.total + 15 } : r))}
            >
              +15s
            </button>
          </div>
        </div>
      )}

      {picker && <ExercisePicker onPick={(e) => void addExercise(e)} onClose={() => setPicker(false)} />}
    </div>
  );
}

