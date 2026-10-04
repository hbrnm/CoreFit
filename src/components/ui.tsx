import { createContext, useContext, useId, type ReactNode } from 'react';
import { AlertTriangle, Check, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { useApp } from '../context';
import { cx } from '../lib/cx';
import type { SyncStatus } from '../lib/db';
import { parseDecimal, toFieldString } from '../lib/numbers';

/** Starea de sincronizare a unui rând. Nu apare în modul local (nu există server). */
export function SyncMark({ status }: { status: SyncStatus }) {
  const { cloud } = useApp();
  if (!cloud) return null;
  if (status === 'synced') {
    return <Check size={16} className="text-success" aria-label="Sincronizat" />;
  }
  if (status === 'error') {
    return <AlertTriangle size={16} className="text-danger" aria-label="Eroare de sincronizare" />;
  }
  return <RefreshCw size={16} className="text-subtle" aria-label="În așteptare" />;
}

interface PanelProps {
  title?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Stilul C (Antrenament, Nutriție): secțiunile nu sunt carduri, ci blocuri despărțite de o linie.
 * Ecranele acelea își învelesc conținutul în <FlatPanels>; în rest, Panel rămâne card.
 */
const FlatContext = createContext(false);

export function FlatPanels({ children }: { children: ReactNode }) {
  return <FlatContext.Provider value={true}>{children}</FlatContext.Provider>;
}

export function Panel({ title, aside, className, children }: PanelProps) {
  const flat = useContext(FlatContext);
  return (
    <section className={cx(flat ? 'border-t border-line pt-4 first:border-t-0 first:pt-0' : 'panel p-4', className)}>
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className={cx('font-display font-bold leading-tight', flat ? 'text-[20px] tracking-tight' : 'text-xl')}>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

interface NoticeProps {
  tone: 'warn' | 'error' | 'info' | 'ok';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

const NOTICE_TONE: Record<NoticeProps['tone'], string> = {
  warn: 'border-l-warning bg-warning/15',
  error: 'border-l-danger bg-danger/10',
  info: 'border-l-brand bg-brand/10',
  ok: 'border-l-success bg-success/10',
};

export function Notice({ tone, title, children, action }: NoticeProps) {
  return (
    <div
      role={tone === 'info' || tone === 'ok' ? 'status' : 'alert'}
      className={cx('rounded-md border-l-4 p-3 text-[15px] leading-snug', NOTICE_TONE[tone])}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

interface StepperProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min?: number;
  max?: number;
  inputMode?: 'decimal' | 'numeric';
}

/** Câmp numeric cu butoane − și +, ușor de folosit cu o singură mână, cu mănuși sau cu palma plină de magneziu. */
export function Stepper({ label, value, onChange, step, min = 0, max, inputMode = 'decimal' }: StepperProps) {
  const id = useId();

  const bump = (delta: number) => {
    const current = parseDecimal(value) ?? 0;
    const next = Math.min(max ?? Infinity, Math.max(min, current + delta));
    onChange(toFieldString(next));
  };

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex">
        <button
          type="button"
          className="stepper-btn rounded-l-lg"
          onClick={() => bump(-step)}
          aria-label={`Scade ${label}`}
        >
          <Minus size={18} />
        </button>
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field min-w-0 rounded-none border-x-0 text-center font-display text-xl font-bold tabular-nums"
        />
        <button
          type="button"
          className="stepper-btn rounded-r-lg"
          onClick={() => bump(step)}
          aria-label={`Crește ${label}`}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

interface CheckRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent: string;
  children: ReactNode;
}

export function CheckRow({ checked, onChange, accent, children }: CheckRowProps) {
  return (
    <label className="flex min-h-[44px] items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cx('mt-0.5 h-6 w-6 shrink-0', accent)}
      />
      <span className="text-[15px] leading-snug">{children}</span>
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4 | 5;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('grid gap-2', columns === 2 && 'grid-cols-2', columns === 3 && 'grid-cols-3', columns === 4 && 'grid-cols-4', columns === 5 && 'grid-cols-5')}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              'btn min-h-[44px] px-2 text-sm',
              selected ? 'bg-fg text-canvas' : 'border border-line bg-fg/5 text-fg active:bg-fg/10',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Panou care urcă de jos, pentru alegeri (alimente, exerciții) fără să părăsești ecranul. */
export function Sheet({ title, onClose, children }: SheetProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-canvas shadow-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pl-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="flex h-12 w-12 items-center justify-center text-muted"
          >
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">{children}</div>
      </div>
    </div>
  );
}

interface UnderlineTabsProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/** Subsecțiunile unui ecran, în stilul C: text, cea activă subliniată, fără fundal. */
export function UnderlineTabs<T extends string>({ label, options, value, onChange }: UnderlineTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-5 overflow-x-auto border-b border-line">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              '-mb-px min-h-[44px] shrink-0 border-b-2 text-[17px] font-semibold',
              selected ? 'border-fg text-fg' : 'border-transparent text-subtle',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface RangePickerProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/** Intervalul unui grafic (7Z / 30Z / 90Z / 1 an): pastile mici, cea aleasă plină, monocrom. */
export function RangePicker<T extends string>({ label, options, value, onChange }: RangePickerProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-fg/[0.06] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-[44px] flex-1 rounded-full text-[15px] font-semibold',
            o.value === value ? 'bg-surface text-fg shadow-sm' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
