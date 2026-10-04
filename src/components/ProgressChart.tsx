import { tone } from '../lib/domains';
import { formatDayMonth } from '../lib/date';
import { formatNum } from '../lib/numbers';
import { gridLines, type SeriesPoint } from '../lib/progress';
import type { Category } from './HealthCard';

interface Props {
  /** intervalul afișat; punctele se așază pe axa timpului, nu la distanțe egale */
  from: string;
  to: string;
  /** linia (1RM, trendul greutății); ultimul punct e în culoarea categoriei */
  line: readonly SeriesPoint[];
  /** puncte gri fără linie (cântăririle zilnice), sub linie */
  dots?: readonly SeriesPoint[];
  category: Category;
  unit: string;
  /** „săpt. asta · 97,5 kg”, sub capătul din dreapta */
  lastLabel: string;
  label: string;
}

const W = 340;
const H = 170;
const PAD_X = 8;
const PAD_Y = 14;

/** Graficul de progres din design/round5/06: grilă cu 2–3 valori, linie neagră, capătul colorat. */
export function ProgressChart({ from, to, line, dots = [], category, unit, lastLabel, label }: Props) {
  const all = [...line, ...dots].map((p) => p.value);
  if (all.length === 0) return null;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const span = Math.max(1, Date.parse(to) - Date.parse(from));
  const x = (date: string) => PAD_X + ((Date.parse(date) - Date.parse(from)) / span) * (W - 2 * PAD_X);
  const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min)) * (H - 2 * PAD_Y);
  const last = line[line.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        {gridLines(lo, hi).map((g) => (
          <g key={g}>
            <line x1="0" x2={W} y1={y(g)} y2={y(g)} strokeWidth="1" style={{ stroke: tone('line') }} />
            <text x="0" y={y(g) - 5} fontSize="12" style={{ fill: tone('subtle') }}>
              {formatNum(g)} {unit}
            </text>
          </g>
        ))}
        {dots.map((p) => (
          <circle key={`d${p.date}`} cx={x(p.date)} cy={y(p.value)} r="2.6" style={{ fill: tone('subtle'), opacity: 0.45 }} />
        ))}
        {line.length > 1 && (
          <polyline
            points={line.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
            fill="none"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ stroke: tone('fg') }}
          />
        )}
        {dots.length === 0 &&
          line.slice(0, -1).map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="3.5" style={{ fill: tone('fg') }} />)}
        {last && <circle cx={x(last.date)} cy={y(last.value)} r="6" style={{ fill: tone(category) }} />}
      </svg>
      <div className="mt-2 flex justify-between text-[13px]">
        <span className="text-subtle">{formatDayMonth(from)}</span>
        <span className="font-semibold" style={{ color: tone(category) }}>
          {lastLabel}
        </span>
      </div>
    </div>
  );
}
