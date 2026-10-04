import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context';
import { db, newId, nowIso, stamp } from '../../lib/db';
import { DOMAIN, tone } from '../../lib/domains';
import { Notice, Panel, Segmented } from '../../components/ui';
import { PlateTimer } from './PlateTimer';

const D = DOMAIN.health;

type Big3Exercise = 'Modified Curl-up' | 'Side Bridge' | 'Bird-Dog';
type StepKind = 'hold' | 'relax' | 'rest';
type Side = 'left' | 'right' | null;
type Phase = 'idle' | 'running' | 'paused' | 'done' | 'stopped';

interface Step {
  kind: StepKind;
  seconds: number;
  set: number;
  rep: number;
  reps: number;
  side: Side;
}

/** Piramida descrescătoare 6-4-2, cu menținere izometrică de 10 secunde. */
const PYRAMID = [6, 4, 2];
const HOLD_SECONDS = 10;
/** Relaxare scurtă între repetări, ca fiecare menținere de 10 s să fie una separată. */
const RELAX_SECONDS = 2;
const REST_SECONDS = 20;

const EXERCISE_OPTIONS: ReadonlyArray<{ value: Big3Exercise; label: string }> = [
  { value: 'Modified Curl-up', label: 'Curl-up' },
  { value: 'Side Bridge', label: 'Side bridge' },
  { value: 'Bird-Dog', label: 'Bird-dog' },
];

const INSTRUCTIONS: Record<Big3Exercise, string> = {
  'Modified Curl-up':
    'Întins pe spate, un genunchi îndoit și celălalt picior întins. Mâinile sub zona lombară, ca să păstrezi curbura naturală. Ridică doar capul și umerii, cu gâtul blocat. Fără flexie lombară.',
  'Side Bridge':
    'Culcat pe o parte, sprijin pe cot și pe picioare (sau pe genunchi, dacă e prea greu). Ridică bazinul și ține corpul aliniat, fără răsucire. Efortul cade pe pătratul lombar și pe abdomen.',
  'Bird-Dog':
    'În patru labe, cu coloana neutră. Întinde brațul și piciorul opus, paralele cu podeaua, împingând călcâiul înapoi. Trunchiul rămâne complet nemișcat.',
};

function sidesFor(exercise: Big3Exercise): Side[] {
  return exercise === 'Modified Curl-up' ? [null] : ['left', 'right'];
}

function sideText(exercise: Big3Exercise, side: Side): string {
  if (side === null) return '';
  if (exercise === 'Side Bridge') return side === 'left' ? 'pe partea stângă' : 'pe partea dreaptă';
  return side === 'left' ? 'brațul stâng, piciorul drept' : 'brațul drept, piciorul stâng';
}

function buildPlan(exercise: Big3Exercise): Step[] {
  const steps: Step[] = [];
  PYRAMID.forEach((reps, setIndex) => {
    for (const side of sidesFor(exercise)) {
      for (let rep = 1; rep <= reps; rep += 1) {
        steps.push({ kind: 'hold', seconds: HOLD_SECONDS, set: setIndex + 1, rep, reps, side });
        if (rep < reps) {
          steps.push({ kind: 'relax', seconds: RELAX_SECONDS, set: setIndex + 1, rep, reps, side });
        }
      }
      steps.push({ kind: 'rest', seconds: REST_SECONDS, set: setIndex + 1, rep: reps, reps, side });
    }
  });
  steps.pop(); // după ultima repetare nu mai e nevoie de pauză
  return steps;
}

function countHolds(plan: Step[], upTo: number): number {
  return plan.slice(0, upTo).filter((s) => s.kind === 'hold').length;
}

function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibrația nu e disponibilă pe toate dispozitivele */
  }
}

export function McGillBigThree() {
  const { userId } = useApp();
  const [exercise, setExercise] = useState<Big3Exercise>('Modified Curl-up');
  const plan = useMemo(() => buildPlan(exercise), [exercise]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => buildPlan('Modified Curl-up')[0].seconds * 1000);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Timpul se calculează din ceasul dispozitivului (nu din numărarea tick-urilor),
  // ca să nu se strice când ecranul se stinge sau tab-ul e în fundal.
  const stepIdxRef = useRef(0);
  const endsAtRef = useRef(0);
  const finishedRef = useRef(false);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  const acquireWake = useCallback(async () => {
    try {
      if (wakeRef.current) return;
      const lock = (await navigator.wakeLock?.request('screen')) ?? null;
      wakeRef.current = lock;
      lock?.addEventListener('release', () => {
        if (wakeRef.current === lock) wakeRef.current = null;
      });
    } catch {
      wakeRef.current = null;
    }
  }, []);

  const releaseWake = useCallback(() => {
    const lock = wakeRef.current;
    wakeRef.current = null;
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  useEffect(() => releaseWake, [releaseWake]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && phase === 'running') void acquireWake();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase, acquireWake]);

  const startedAtRef = useRef<number | null>(null);

  const saveSession = useCallback(
    async (stoppedForPain: boolean) => {
      try {
        const startedAt = startedAtRef.current ?? Date.now();
        await db.healthSessions.put({
          id: newId(),
          user_id: userId,
          program_id: 'lower-back-mcgill',
          started_at: new Date(startedAt).toISOString(),
          completed_at: nowIso(),
          duration_s: Math.round((Date.now() - startedAt) / 1000),
          pain_before: null,
          pain_after: null,
          stopped_for_pain: stoppedForPain,
          deleted: false,
          ...stamp(),
        });
        setSaveError(null);
      } catch {
        setSaveError('Sesiunea nu s-a putut salva pe dispozitiv. Verifică spațiul de stocare.');
      }
    },
    [userId],
  );

  const reset = useCallback(
    (forExercise: Big3Exercise) => {
      const nextPlan = buildPlan(forExercise);
      finishedRef.current = false;
      stepIdxRef.current = 0;
      startedAtRef.current = null;
      releaseWake();
      setPhase('idle');
      setStepIdx(0);
      setRemainingMs(nextPlan[0].seconds * 1000);
      setSaveError(null);
    },
    [releaseWake],
  );

  const changeExercise = (next: Big3Exercise) => {
    setExercise(next);
    reset(next);
  };

  const start = () => {
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    finishedRef.current = false;
    endsAtRef.current = Date.now() + remainingMs;
    setPhase('running');
    void acquireWake();
  };

  const pause = () => {
    setRemainingMs(Math.max(0, endsAtRef.current - Date.now()));
    setPhase('paused');
    releaseWake();
  };

  const stopBecauseOfPain = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    releaseWake();
    setPhase('stopped');
    void saveSession(true);
  };

  useEffect(() => {
    if (phase !== 'running') return;

    const id = window.setInterval(() => {
      if (finishedRef.current) return;

      const left = endsAtRef.current - Date.now();
      if (left > 0) {
        setRemainingMs(left);
        return;
      }

      const next = stepIdxRef.current + 1;
      if (next >= plan.length) {
        finishedRef.current = true;
        setRemainingMs(0);
        setPhase('done');
        releaseWake();
        buzz([200, 100, 200]);
        void saveSession(false);
        return;
      }

      stepIdxRef.current = next;
      endsAtRef.current += plan[next].seconds * 1000;
      setStepIdx(next);
      setRemainingMs(Math.max(0, endsAtRef.current - Date.now()));
      buzz(plan[next].kind === 'hold' ? 150 : 60);
    }, 200);

    return () => window.clearInterval(id);
  }, [phase, plan, saveSession, releaseWake]);

  const step = plan[stepIdx];
  const active = phase === 'running' || phase === 'paused';
  const totalHolds = countHolds(plan, plan.length);
  const totalMinutes = Math.ceil(plan.reduce((sum, s) => sum + s.seconds, 0) / 60);

  let plateColor: string = tone('health');
  if (phase === 'done') plateColor = tone('success');
  else if (phase === 'stopped') plateColor = tone('danger');
  else if (active) {
    plateColor = step.kind === 'hold' ? tone('health') : step.kind === 'relax' ? tone('subtle') : tone('warning');
  }

  const progress =
    phase === 'done' ? 1 : active ? 1 - remainingMs / (step.seconds * 1000) : 0;

  const nextStep = plan[stepIdx + 1] as Step | undefined;

  let holeLabel = 'gata de start';
  if (phase === 'paused') holeLabel = 'în pauză';
  else if (phase === 'running') {
    holeLabel = step.kind === 'hold' ? 'menține' : step.kind === 'relax' ? 'relaxează' : 'pauză';
  }

  let detail: string;
  if (phase === 'idle') {
    detail = `${totalHolds} menținute de ${HOLD_SECONDS} s, aproximativ ${totalMinutes} min`;
  } else if (active) {
    if (step.kind === 'rest' && nextStep) {
      const side = sideText(exercise, nextStep.side);
      detail = `Urmează setul ${nextStep.set} din ${PYRAMID.length}, ${nextStep.reps} repetări${side ? `, ${side}` : ''}`;
    } else {
      const side = sideText(exercise, step.side);
      detail = `Setul ${step.set} din ${PYRAMID.length}, repetarea ${step.rep} din ${step.reps}${side ? `, ${side}` : ''}`;
    }
  } else {
    detail = '';
  }

  return (
    <Panel title="Big 3 McGill" aside={<span className="text-muted">6-4-2, menținere 10 s</span>}>
      <div className="flex flex-col gap-4">
        <div className={active ? 'opacity-50' : ''} inert={active}>
          <Segmented<Big3Exercise>
            label="Exercițiu"
            options={EXERCISE_OPTIONS}
            value={exercise}
            onChange={changeExercise}
            columns={3}
          />
        </div>

        <p className="text-[15px] leading-snug text-fg">{INSTRUCTIONS[exercise]}</p>

        <div>
          <PlateTimer color={plateColor} progress={progress}>
            {phase === 'done' || phase === 'stopped' ? (
              <span className="num text-5xl">{phase === 'done' ? 'Gata' : 'Oprit'}</span>
            ) : (
              <>
                <span className="num text-7xl leading-none" aria-live="off">
                  {Math.ceil(remainingMs / 1000)}
                </span>
                <span className="mt-1 text-sm font-medium text-muted">{holeLabel}</span>
              </>
            )}
          </PlateTimer>
          {detail && (
            <p className="mt-3 text-center text-[15px]" aria-live="polite">
              {detail}
            </p>
          )}
          {active && (
            <div className="mt-3 h-1.5 w-full bg-fg/10" aria-hidden="true">
              <div className="h-full bg-health" style={{ width: `${(stepIdx / plan.length) * 100}%` }} />
            </div>
          )}
        </div>

        {phase === 'done' && <Notice tone="info">Sesiune încheiată și salvată în jurnal.</Notice>}
        {phase === 'stopped' && (
          <Notice tone="warn" title="Sesiune oprită">
            Am notat durerea în jurnal. Nu forța: revino când disconfortul a trecut. Dacă revine sau coboară în picior,
            discută cu un medic sau kinetoterapeut.
          </Notice>
        )}
        {saveError && <Notice tone="error">{saveError}</Notice>}

        <div className="grid grid-cols-2 gap-3">
          {phase === 'idle' && (
            <button type="button" onClick={start} className={`btn col-span-2 ${D.solid}`}>
              <Play size={18} />
              Start
            </button>
          )}
          {phase === 'running' && (
            <button type="button" onClick={pause} className="btn bg-warning-solid text-on-brand active:bg-warning-solid/90">
              <Pause size={18} />
              Pauză
            </button>
          )}
          {phase === 'paused' && (
            <button type="button" onClick={start} className={`btn ${D.solid}`}>
              <Play size={18} />
              Continuă
            </button>
          )}
          {active && (
            <button type="button" onClick={stopBecauseOfPain} className="btn-danger">
              <ShieldAlert size={18} />
              Am durere
            </button>
          )}
          {(phase === 'paused' || phase === 'done' || phase === 'stopped') && (
            <button type="button" onClick={() => reset(exercise)} className="btn-quiet col-span-2">
              <RotateCcw size={18} />
              De la capăt
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
