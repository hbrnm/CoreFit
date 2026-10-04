import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cx } from '../lib/cx';
import { tone as toneColor } from '../lib/domains';
import { formatNum } from '../lib/numbers';

/*
 * Cardurile de pe Acasă, după anatomia din Apple Health: sus eticheta mică în culoarea
 * categoriei și „când ›”, jos cifra mare cu unitatea mică, eventual un mini-grafic gri cu
 * valoarea de azi evidențiată. Culoarea categoriei apare doar aici; restul e monocrom.
 */

export type Category = 'workouts' | 'nutrition' | 'health' | 'water' | 'body';

const LABEL: Record<Category, string> = {
  workouts: 'text-workouts',
  nutrition: 'text-nutrition',
  health: 'text-health',
  water: 'text-water',
  body: 'text-body',
};

interface CardProps {
  category: Category;
  icon: LucideIcon;
  label: string;
  /** „Azi”, „4 săpt.”: lângă săgeată */
  when?: string;
  /** apăsarea pe antet (deschide secțiunea) */
  onOpen?: () => void;
  children: ReactNode;
}

export function HealthCard({ category, icon: Icon, label, when, onOpen, children }: CardProps) {
  const head = (
    <>
      <span className={cx('flex items-center gap-1.5 font-semibold', LABEL[category])}>
        <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
        {label}
      </span>
      {(when || onOpen) && (
        <span className="flex items-center gap-0.5 text-sm text-subtle">
          {when}
          {onOpen && <ChevronRight size={16} aria-hidden="true" />}
        </span>
      )}
    </>
  );
  return (
    <section className="panel px-4 pb-4 pt-3">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="-mx-1 flex min-h-[44px] w-[calc(100%+0.5rem)] items-center justify-between px-1 text-left text-[15px]">
          {head}
        </button>
      ) : (
        <div className="flex min-h-[44px] items-center justify-between text-[15px]">{head}</div>
      )}
      {children}
    </section>
  );
}

/** Cifra mare cu unitatea mică: „1.840 kcal”. */
export function BigValue({ value, unit, className }: { value: string; unit?: string; className?: string }) {
  return (
    <span className={cx('num text-[34px] leading-none', className)}>
      {value}
      {unit && <span className="ml-1 text-[17px] font-semibold tracking-normal text-subtle">{unit}</span>}
    </span>
  );
}

/** Bare mici, gri; ultima (azi) în culoarea categoriei. */
export function MiniBars({ values, category, label }: { values: readonly number[]; category: Category; label: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-11 items-end gap-1" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span
          key={i}
          className="block w-[7px] rounded-sm"
          style={{
            height: `${Math.max(4, (v / max) * 44)}px`,
            background: i === values.length - 1 ? toneColor(category) : toneColor('line'),
          }}
        />
      ))}
    </div>
  );
}

/** Linie mică gri cu ultimul punct în culoarea categoriei (greutatea pe 30 de zile). */
export function Sparkline({ values, category, label }: { values: readonly number[]; category: Category; label: string }) {
  if (values.length < 2) return null;
  const W = 120;
  const H = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => 4 + (i * (W - 8)) / (values.length - 1);
  const y = (v: number) => 6 + (1 - (v - min) / span) * (H - 12);
  const last = values.length - 1;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        fill="none"
        style={{ stroke: toneColor('subtle', 0.45) }}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r="4" style={{ fill: toneColor(category) }} />
    </svg>
  );
}

/** Puncte zilnice gri față de linia țintei, azi evidențiat (Tendințe → Calorii). */
export function DotsChart({
  values,
  target,
  category,
  firstLabel,
  label,
}: {
  values: readonly number[];
  target: number | null;
  category: Category;
  firstLabel: string;
  label: string;
}) {
  const W = 330;
  const H = 110;
  const shown = values.filter((v) => v > 0);
  const lo = Math.min(...shown, target ?? Infinity) * 0.92;
  const hi = Math.max(...shown, target ?? 0) * 1.05;
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H;
  const x = (i: number) => 6 + (i * (W - 12)) / Math.max(1, values.length - 1);
  const last = values.length - 1;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 4}`} className="mt-1 w-full" role="img" aria-label={label}>
        {target !== null && (
          <>
            <line x1="0" x2={W} y1={y(target)} y2={y(target)} strokeWidth="2" strokeDasharray="5 4" style={{ stroke: toneColor(category) }} />
            <text x={W} y={y(target) - 7} textAnchor="end" fontSize="12" fontWeight="700" style={{ fill: toneColor(category) }}>
              țintă {formatNum(target, 0)}
            </text>
          </>
        )}
        {values.map((v, i) =>
          v > 0 ? (
            <circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={i === last ? 5 : 3.5}
              style={{ fill: i === last ? toneColor(category) : toneColor('subtle'), opacity: i === last ? 1 : 0.55 }}
            />
          ) : null,
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[13px] text-subtle">
        <span>{firstLabel}</span>
        <span className={LABEL[category]}>azi</span>
      </div>
    </div>
  );
}

/** Bare gri pe săptămâni, cu linia de medie în culoarea categoriei (Tendințe → Forță). */
export function WeekBars({
  values,
  avg,
  category,
  firstLabel,
  label,
}: {
  values: readonly number[];
  avg: number;
  category: Category;
  firstLabel: string;
  label: string;
}) {
  const max = Math.max(1, ...values, avg) * 1.1;
  const H = 96;
  const yAvg = H - (avg / max) * H;
  return (
    <div>
      <div className="relative mt-1 flex items-end gap-[5px]" style={{ height: H }} role="img" aria-label={label}>
        {values.map((v, i) => (
          <span key={i} className="block flex-1 rounded-sm" style={{ height: `${(v / max) * H}px`, background: toneColor('line') }} />
        ))}
        <span className="absolute inset-x-0 h-[3px] rounded-sm" style={{ top: yAvg, background: toneColor(category) }} />
        <span className={cx('absolute right-0 text-[13px] font-bold', LABEL[category])} style={{ top: yAvg - 20 }}>
          {formatNum(avg)}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-subtle">
        <span>{firstLabel}</span>
        <span className={LABEL[category]}>medie / săpt.</span>
      </div>
    </div>
  );
}
