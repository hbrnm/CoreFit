import { formatNum } from '../lib/numbers';

export interface ChartPoint {
  /** etichetă pentru axa X, ex. "12 sep" */
  label: string;
  y: number;
}

interface LineChartProps {
  points: ChartPoint[];
  /** culoare CSS, de obicei tone(...) din lib/domains */
  color: string;
  height?: number;
  unit?: string;
  /** al doilea șir, desenat mai subțire (ex. greutatea zilnică față de trend) */
  secondary?: ChartPoint[];
}

/** Grafic simplu în SVG: o linie, valorile minimă și maximă și primul/ultimul moment. */
export function LineChart({ points, color, height = 140, unit = '', secondary }: LineChartProps) {
  if (points.length === 0) return null;

  const W = 300;
  const padX = 8;
  const padTop = 14;
  const padBottom = 22;
  const all = [...points, ...(secondary ?? [])].map((p) => p.y);
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const innerH = height - padTop - padBottom;

  const xAt = (i: number, n: number) => (n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1));
  const yAt = (v: number) => padTop + innerH - ((v - min) / span) * innerH;
  const path = (pts: ChartPoint[]) => pts.map((p, i) => `${xAt(i, pts.length)},${yAt(p.y)}`).join(' ');

  const last = points[points.length - 1];
  const summary = `${points.length} valori, de la ${formatNum(points[0].y)} la ${formatNum(last.y)} ${unit}`.trim();

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={summary}>
      <line x1={padX} x2={W - padX} y1={yAt(min)} y2={yAt(min)} className="stroke-line" />
      <line x1={padX} x2={W - padX} y1={yAt(max)} y2={yAt(max)} className="stroke-line" />
      {secondary && secondary.length > 1 && (
        <polyline points={path(secondary)} fill="none" style={{ stroke: color }} strokeOpacity="0.35" strokeWidth="1.5" />
      )}
      {points.length > 1 && <polyline points={path(points)} fill="none" style={{ stroke: color }} strokeWidth="2.5" strokeLinejoin="round" />}
      <circle cx={xAt(points.length - 1, points.length)} cy={yAt(last.y)} r="4" style={{ fill: color }} />
      <text x={padX} y={padTop - 3} fontSize="10" className="fill-subtle">
        {formatNum(max)} {unit}
      </text>
      <text x={padX} y={height - 5} fontSize="10" className="fill-subtle">
        {points[0].label}
      </text>
      <text x={W - padX} y={height - 5} fontSize="10" textAnchor="end" className="fill-subtle">
        {last.label}
      </text>
    </svg>
  );
}

interface BarListProps {
  items: Array<{ label: string; value: number }>;
  color: string;
  unit?: string;
}

/** Bare orizontale, pentru comparații (ex. serii pe grupă musculară). */
export function BarList({ items, color, unit = '' }: BarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-[15px]">
          <span className="truncate text-fg">{i.label}</span>
          <span className="h-2.5 bg-fg/10" aria-hidden="true">
            <span className="block h-full" style={{ width: `${(i.value / max) * 100}%`, backgroundColor: color }} />
          </span>
          <span className="text-right tabular-nums">
            {formatNum(i.value, 0)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
