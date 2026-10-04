import { useEffect, useMemo, useRef, useState } from 'react';
import type { HealthProgram } from '../../data/health';
import { buildSteps, stepLabel, workPosition } from '../../lib/programSteps';
import { useApp } from '../../context';
import { db, newId, nowIso, stamp } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { Notice, Panel } from '../../components/ui';
import { GuidedScreen } from './GuidedScreen';
import { PainPicker } from './PainPicker';

const D = DOMAIN.health;

function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibrația nu e disponibilă peste tot */
  }
}

type Phase = 'pain-before' | 'running' | 'pain-after';

interface Props {
  program: HealthProgram;
  onExit: () => void;
}

export function ProgramPlayer({ program, onExit }: Props) {
  const { userId } = useApp();
  const steps = useMemo(() => buildSteps(program), [program]);

  const [phase, setPhase] = useState<Phase>('pain-before');
  const [painBefore, setPainBefore] = useState<number | null>(null);
  const [painAfter, setPainAfter] = useState<number | null>(null);
  const [stopped, setStopped] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [timing, setTiming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const endsAtRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  const step = steps[stepIdx];
  const exercise = program.exercises[step?.exIdx ?? 0];

  const startTimer = (seconds: number) => {
    endsAtRef.current = Date.now() + seconds * 1000;
    setRemainingMs(seconds * 1000);
    setTiming(true);
  };

  const advance = () => {
    setTiming(false);
    setPaused(false);
    if (stepIdx + 1 >= steps.length) {
      buzz([200, 100, 200]);
      setPhase('pain-after');
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  // la fiecare pas nou: pauzele pornesc singure, exercițiile așteaptă "Start"
  useEffect(() => {
    if (phase !== 'running' || !step) return;
    if (step.kind === 'rest') {
      startTimer(step.seconds ?? 0);
    } else {
      setTiming(false);
      setRemainingMs((step.seconds ?? 0) * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase]);

  useEffect(() => {
    if (!timing) return;
    const id = window.setInterval(() => {
      const left = endsAtRef.current - Date.now();
      if (left > 0) {
        setRemainingMs(left);
      } else {
        buzz(150);
        window.clearInterval(id);
        advance();
      }
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timing, stepIdx]);

  // ecranul rămâne aprins cât timp rulează sesiunea
  useEffect(() => {
    if (phase !== 'running') return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => {
        if (cancelled) void l.release().catch(() => undefined);
        else lock = l;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (lock) void lock.release().catch(() => undefined);
    };
  }, [phase]);

  const begin = (pain: number | null) => {
    setPainBefore(pain);
    startedAtRef.current = Date.now();
    setPhase('running');
  };

  const togglePause = () => {
    if (paused) {
      endsAtRef.current = Date.now() + remainingMs;
      setPaused(false);
      setTiming(true);
    } else if (timing) {
      setRemainingMs(Math.max(0, endsAtRef.current - Date.now()));
      setTiming(false);
      setPaused(true);
    }
  };

  const stopForPain = () => {
    setTiming(false);
    setStopped(true);
    setPhase('pain-after');
  };

  const save = async () => {
    try {
      const started = startedAtRef.current ?? Date.now();
      await db.healthSessions.put({
        id: newId(),
        user_id: userId,
        program_id: program.id,
        started_at: new Date(started).toISOString(),
        completed_at: nowIso(),
        duration_s: Math.round((Date.now() - started) / 1000),
        pain_before: painBefore,
        pain_after: painAfter,
        stopped_for_pain: stopped,
        deleted: false,
        ...stamp(),
      });
      onExit();
    } catch {
      setError('Sesiunea nu s-a putut salva pe dispozitiv. Verifică spațiul de stocare.');
    }
  };

  if (phase === 'pain-before') {
    return (
      <Panel title={program.title}>
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">Cât te doare acum? 0 înseamnă deloc, 10 cea mai mare durere imaginabilă.</p>
          <PainPicker label="Durere înainte" value={painBefore} onChange={setPainBefore} />
          <button type="button" className={`btn ${D.solid}`} onClick={() => begin(painBefore)}>
            Începe
          </button>
          <button type="button" className="btn-quiet" onClick={() => begin(null)}>
            Începe fără să notez durerea
          </button>
          <button type="button" className="btn-outline" onClick={onExit}>
            Înapoi
          </button>
        </div>
      </Panel>
    );
  }

  if (phase === 'pain-after') {
    return (
      <Panel title={stopped ? 'Sesiune oprită' : 'Sesiune încheiată'}>
        <div className="flex flex-col gap-4">
          {stopped && (
            <Notice tone="warn">
              Ai oprit sesiunea din cauza durerii. Nu forța: revino când disconfortul a trecut. Dacă persistă sau apar
              semnele de alarmă din program, cere un consult medical.
            </Notice>
          )}
          <p className="text-[15px]">Cât te doare acum?</p>
          <PainPicker label="Durere după" value={painAfter} onChange={setPainAfter} />
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" className={`btn ${D.solid}`} onClick={() => void save()}>
            Salvează sesiunea
          </button>
        </div>
      </Panel>
    );
  }

  const isRest = step.kind === 'rest';
  const upcoming = steps[stepIdx + 1];
  const shown = isRest && upcoming ? upcoming : step;
  const shownExercise = program.exercises[shown.exIdx];
  const totalMs = (step.seconds ?? 0) * 1000;
  const holding = !isRest && step.seconds !== null;

  return (
    <GuidedScreen
      title={program.title}
      startedAt={startedAtRef.current ?? Date.now()}
      onClose={() => {
        if (window.confirm('Ieși din sesiune fără să salvezi?')) onExit();
      }}
      paused={paused}
      onTogglePause={timing || paused ? togglePause : undefined}
      position={workPosition(steps, stepIdx)}
      ring={
        isRest || holding
          ? { remainingMs, totalMs, label: isRest ? 'Pauză' : timing ? 'Ține' : 'Gata de start' }
          : null
      }
      center={
        <>
          <span className="num text-[72px] leading-none">{step.reps}</span>
          <span className="mt-2 text-[17px] font-semibold text-muted">repetări</span>
        </>
      }
      name={isRest ? `Urmează: ${shownExercise.name}` : exercise.name}
      sub={stepLabel(shown)}
      how={isRest ? undefined : [exercise.how, exercise.progress].filter(Boolean).join(' ')}
      primary={
        holding && !timing && !paused
          ? { label: 'Start', onClick: () => startTimer(step.seconds ?? 0) }
          : !isRest && step.reps !== null
            ? { label: 'Am terminat seria', onClick: advance }
            : null
      }
      secondary={isRest || timing || paused ? { label: isRest ? 'Sari peste pauză' : 'Sari peste', onClick: advance } : null}
      onPain={stopForPain}
    />
  );
}
