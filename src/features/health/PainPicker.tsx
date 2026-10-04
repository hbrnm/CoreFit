import { cx } from '../../lib/cx';


interface Props {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

/** Scala de durere 0-10 (0 = deloc, 10 = cea mai mare durere imaginabilă). */
export function PainPicker({ label, value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-2">
      {Array.from({ length: 11 }, (_, n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={cx(
            'btn min-h-[48px] px-0 font-display text-xl',
            value === n ? 'bg-fg text-canvas' : 'border border-line bg-fg/5 text-fg active:bg-fg/10',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
