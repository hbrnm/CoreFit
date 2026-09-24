import { useEffect, useState } from 'react';
import { exerciseArt, type ExerciseArt } from '../data/exerciseMedia';
import { cx } from '../lib/cx';

const STEP_MS = 800;

const listeners = new Set<(frame: 0 | 1) => void>();
let frame: 0 | 1 = 0;
let timer: number | undefined;

function subscribe(onFrame: (frame: 0 | 1) => void): () => void {
  listeners.add(onFrame);
  onFrame(frame);
  if (timer === undefined) {
    timer = window.setInterval(() => {
      frame = frame === 0 ? 1 : 0;
      for (const listener of listeners) listener(frame);
    }, STEP_MS);
  }
  return () => {
    listeners.delete(onFrame);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduce;
}

interface Props {
  exerciseId: string;
  name: string;
  size?: 'list' | 'card';
}

export function ExerciseFigure({ exerciseId, name, size = 'list' }: Props) {
  const art = exerciseArt(exerciseId);
  const reduce = useReducedMotion();
  const [step, setStep] = useState<0 | 1>(0);
  const [paused, setPaused] = useState(false);
  const looping = Boolean(art?.second) && !reduce && !paused;

  useEffect(() => {
    if (!looping) return;
    return subscribe(setStep);
  }, [looping]);

  useEffect(() => {
    if (!art?.second) return;
    const preload = new Image();
    preload.src = art.second;
  }, [art]);

  if (!art) return null;

  const box = size === 'card' ? 'h-24 w-24' : 'h-14 w-14';
  const picture = <Frames art={art} step={art.second ? step : 0} box={box} />;

  if (size !== 'card' || !art.second) return picture;

  return (
    <button
      type="button"
      onClick={() => {
        if (reduce) setStep((v) => (v === 0 ? 1 : 0));
        else setPaused((v) => !v);
      }}
      aria-label={
        reduce
          ? `Poziția ${step + 1} din 2 pentru ${name}.`
          : paused
            ? `Animație oprită pentru ${name}. Pornește.`
            : `Animație pentru ${name}. Oprește.`
      }
      className="shrink-0"
    >
      {picture}
      {paused && <span className="mt-1 block text-center text-xs font-semibold text-steel/70">Oprit</span>}
    </button>
  );
}

function Frames({ art, step, box }: { art: ExerciseArt; step: 0 | 1; box: string }) {
  const showSecond = step === 1 && Boolean(art.second);
  return (
    <span className={cx('relative block overflow-hidden rounded-md bg-[#d7ebf5]', box)}>
      <img
        src={art.first}
        alt=""
        className={cx('absolute inset-0 h-full w-full object-contain', showSecond ? 'opacity-0' : 'opacity-100')}
      />
      {art.second && (
        <img
          src={art.second}
          alt=""
          className={cx('absolute inset-0 h-full w-full object-contain', showSecond ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </span>
  );
}
