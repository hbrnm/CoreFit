import type { ReactNode } from 'react';
import { PLATE } from '../../lib/domains';

interface Props {
  /** culoarea discului */
  color: string;
  /** 0..1, cât din pasul curent a trecut */
  progress: number;
  /** conținutul din gaura discului (cifra și eticheta) */
  children: ReactNode;
}

const RING_RADIUS = 92;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Cronometrul este un disc de haltere: culoarea arată starea, inelul alb arată timpul scurs. */
export function PlateTimer({ color, progress, children }: Props) {
  const p = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative mx-auto h-60 w-60">
      <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden="true">
        <circle cx="120" cy="120" r="116" fill={color} style={{ transition: 'fill 0.3s' }} />
        <circle cx="120" cy="120" r="104" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" />
        <circle cx="120" cy="120" r={RING_RADIUS} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="10" />
        <circle
          cx="120"
          cy="120"
          r={RING_RADIUS}
          fill="none"
          stroke="#fff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - p)}
          transform="rotate(-90 120 120)"
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
        <circle cx="120" cy="120" r="66" fill={PLATE.chalk} />
        <circle cx="120" cy="120" r="66" fill="none" stroke={PLATE.steel} strokeOpacity="0.18" strokeWidth="2" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-steel">{children}</div>
    </div>
  );
}
