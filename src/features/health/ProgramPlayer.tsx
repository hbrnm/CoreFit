import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { HealthProgram } from '../../data/health';
import { useApp } from '../../context';
import { db, newId, nowIso, stamp } from '../../lib/db';
import { DOMAIN, tone } from '../../lib/domains';
import { Notice, Panel } from '../../components/ui';
import { PlateTimer } from '../spine-health/PlateTimer';
import { PainPicker } from './PainPicker';

const D = DOMAIN.health;

interface Step {
  kind: 'work' | 'rest';
  exIdx: number;
  setNo: number;
  sets: number;
  side: 'left' | 'right' | null;
  seconds: number | null;
  reps: number | null;
}

function buildSteps(program: HealthProgram): Step[] {
  const steps: Step[] = [];
  program.exercises.forEach((ex, exIdx) => {
    const sides: Array<'left' | 'right' | null> = ex.perSide ? ['left', 'right'] : [null];
    for (let setNo = 1; setNo <= ex.sets; setNo += 1) {
      for (const side of sides) {
        steps.push({
          kind: 'work',
          exIdx,
          setNo,
          sets: ex.sets,
          side,
          seconds: ex.kind === 'hold' ? (ex.holdS ?? 30) : null,
          reps: ex.kind === 'reps' ? (ex.reps ?? 10) : null,
        });
      }
      const last = exIdx === program.exercises.length - 1 && setNo === ex.sets;
      if (ex.restS > 0 && !last) {
        steps.push({ kind: 'rest', exIdx, setNo, sets: ex.sets, side: null, seconds: ex.restS, reps: null });
      }
    }
  });
  return steps;
}

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
      <Panel title={program.title} edge={D.edge}>
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
      <Panel title={stopped ? 'Sesiune oprită' : 'Sesiune încheiată'} edge={D.edge}>
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

  const sideText = step.side === 'left' ? 'partea stângă' : step.side === 'right' ? 'partea dreaptă' : '';
  const isRest = step.kind === 'rest';
  const upcoming = steps[stepIdx + 1];
  const nextName = isRest && upcoming ? program.exercises[upcoming.exIdx].name : '';
  const plateColor = isRest ? tone('warning') : tone('health');
  const totalMs = (step.seconds ?? 0) * 1000;
  const progress = timing && totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold leading-tight">{program.title}</h2>
        <div className="mt-2 h-1.5 w-full bg-fg/10" aria-hidden="true">
          <div className={`h-full ${D.bar}`} style={{ width: `${(stepIdx / steps.length) * 100}%` }} />
        </div>
      </div>

      <Panel edge={D.edge}>
        <div className="flex flex-col gap-3">
          {isRest ? (
            <>
              <p className="font-display text-2xl font-bold">Odihnă</p>
              <p className="text-[15px] text-muted">Urmează: {nextName}</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-bold">{exercise.name}</p>
              <p className="text-[15px] text-muted">
                Seria {step.setNo} din {step.sets}
                {sideText ? `, ${sideText}` : ''}
              </p>
              <p className="text-[15px] leading-snug">{exercise.how}</p>
              {exercise.progress && <p className="text-sm text-muted">{exercise.progress}</p>}
            </>
          )}

          {(isRest || step.seconds !== null) && (
            <PlateTimer color={plateColor} progress={progress}>
              <span className="num text-7xl leading-none">{Math.ceil(remainingMs / 1000)}</span>
              <span className="mt-1 text-sm font-medium text-muted">
                {isRest ? 'odihnă' : timing ? 'menține' : 'gata de start'}
              </span>
            </PlateTimer>
          )}

          {!isRest && step.reps !== null && (
            <p className="num text-center text-6xl leading-none">
              {step.reps}
              <span className="ml-2 text-xl font-semibold text-muted">repetări</span>
            </p>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        {!isRest && step.seconds !== null && !timing && (
          <button type="button" className={`btn col-span-2 ${D.solid}`} onClick={() => startTimer(step.seconds ?? 0)}>
            Start
          </button>
        )}
        {!isRest && step.reps !== null && (
          <button type="button" className={`btn col-span-2 ${D.solid}`} onClick={advance}>
            Am terminat seria
          </button>
        )}
        {(isRest || timing) && (
          <button type="button" className="btn-quiet col-span-2" onClick={advance}>
            Sari peste
          </button>
        )}
        <button type="button" className="btn-danger" onClick={stopForPain}>
          <ShieldAlert size={18} />
          Am durere
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => {
            if (window.confirm('Ieși din sesiune fără să salvezi?')) onExit();
          }}
        >
          Ieși
        </button>
      </div>
    </div>
  );
}
