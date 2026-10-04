import { useEffect, useState, type ReactNode } from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import { tone } from '../../lib/domains';

/*
 * Ecranul unui program ghidat, pe tot ecranul (design/round5/07-health): bara de sus cu
 * Închide, timpul scurs și pauza; titlul și pașii; inelul cronometrului; numele mișcării și
 * cum se face; jos acțiunea și „Mă doare, opresc”. Doar prezentare: logica rămâne în player.
 */

interface Action {
  label: string;
  onClick: () => void;
}

interface Props {
  title: string;
  /** începutul sesiunii (ms), pentru ceasul de sus */
  startedAt: number;
  onClose: () => void;
  paused?: boolean;
  onTogglePause?: () => void;
  position: { n: number; total: number };
  /** cronometrul din inel; fără el, inelul arată `center` (ex. repetările) */
  ring: { remainingMs: number; totalMs: number; label: string } | null;
  center?: ReactNode;
  name: string;
  sub: string;
  how?: string;
  primary?: Action | null;
  secondary?: Action | null;
  onPain: () => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/** Peste atâția pași, segmentele devin o bară continuă (nu mai încap). */
const MAX_SEGMENTS = 24;

export function GuidedScreen(p: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const R = 130;
  const C = 2 * Math.PI * R;
  const frac = p.ring && p.ring.totalMs > 0 ? Math.min(1, Math.max(0, p.ring.remainingMs / p.ring.totalMs)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-canvas px-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={p.title}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex min-h-[44px] items-center justify-between">
          <button type="button" className="min-h-[44px] pr-3 text-[17px] text-brand-fg" onClick={p.onClose}>
            Închide
          </button>
          <span className="num flex items-center gap-1.5 text-[17px]">
            <Clock size={18} aria-hidden="true" />
            {fmt(Math.floor((now - p.startedAt) / 1000))}
          </span>
          {p.onTogglePause ? (
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-end text-brand-fg"
              aria-label={p.paused ? 'Continuă' : 'Pauză'}
              onClick={p.onTogglePause}
            >
              {p.paused ? <Play size={22} /> : <Pause size={22} />}
            </button>
          ) : (
            <span className="w-11" />
          )}
        </div>

        <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight">{p.title}</h1>
        <p className="text-[17px] text-muted">
          Pasul {p.position.n} din {p.position.total}
        </p>
        {p.position.total <= MAX_SEGMENTS ? (
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: p.position.total }, (_, i) => (
              <span key={i} className={i < p.position.n ? 'h-1 flex-1 rounded-full bg-fg' : 'h-1 flex-1 rounded-full bg-fg/10'} />
            ))}
          </div>
        ) : (
          <div className="mt-2 h-1 rounded-full bg-fg/10" aria-hidden="true">
            <div className="h-full rounded-full bg-fg" style={{ width: `${(p.position.n / p.position.total) * 100}%` }} />
          </div>
        )}

        <div className="relative mx-auto mt-6 h-[280px] w-[280px]">
          <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" style={{ stroke: tone('fg', 0.1) }} />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ stroke: tone('fg'), transition: 'stroke-dashoffset 200ms linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-live="off">
            {p.ring ? (
              <>
                <span className="num text-[72px] leading-none">{fmt(Math.ceil(p.ring.remainingMs / 1000))}</span>
                <span className="mt-2 text-[17px] font-semibold text-muted">{p.paused ? 'În pauză' : p.ring.label}</span>
              </>
            ) : (
              p.center
            )}
          </div>
        </div>

        <div className="mt-6 text-center" aria-live="polite">
          <p className="text-[26px] font-extrabold leading-tight tracking-tight">{p.name}</p>
          <p className="mt-1 text-[17px] text-muted">{p.sub}</p>
          {p.how && <p className="mx-auto mt-2 max-w-sm text-[15px] leading-snug text-subtle">{p.how}</p>}
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-6">
          {p.primary && (
            <button type="button" className="btn-primary min-h-[56px] text-[17px]" onClick={p.primary.onClick}>
              {p.primary.label}
            </button>
          )}
          {p.secondary && (
            <button type="button" className="btn min-h-[52px] bg-fg/[0.08] text-[17px] text-fg" onClick={p.secondary.onClick}>
              {p.secondary.label}
            </button>
          )}
          <button
            type="button"
            className="btn min-h-[56px] border border-line-strong/40 text-[17px] text-fg active:bg-fg/5"
            onClick={p.onPain}
          >
            Mă doare, opresc
          </button>
        </div>
      </div>
    </div>
  );
}
