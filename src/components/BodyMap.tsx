import { MUSCLE_LABELS, type Muscle } from '../data/exercises';

/*
 * Corpul văzut din față și din spate, cu cele 10 grupe CoreFit colorate.
 * Schemă, nu anatomie: forme simple, ca să se vadă dintr-o privire unde e culoarea.
 */

type Shape = { muscle: Muscle; d: string };

// Coordonate pe o figură de 100 x 220. Formele sunt simetrice față de x = 50.
const mirror = (d: string): string =>
  d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${100 - Number(x)},${y}`);

const pair = (muscle: Muscle, d: string): Shape[] => [
  { muscle, d },
  { muscle, d: mirror(d) },
];

const FRONT: Shape[] = [
  ...pair('shoulders', 'M30,44 C24,44 20,49 20,56 L28,58 C29,52 31,48 36,46 Z'),
  ...pair('chest', 'M36,47 C42,45 48,46 49,47 L49,64 C43,66 36,65 31,61 C30,54 32,49 36,47 Z'),
  ...pair('biceps', 'M20,58 L28,60 C28,68 27,76 25,82 L18,80 C18,72 18,64 20,58 Z'),
  { muscle: 'core', d: 'M33,64 C39,67 45,68 50,68 C55,68 61,67 67,64 L65,98 C60,102 40,102 35,98 Z' },
  ...pair('quads', 'M35,104 C40,106 46,106 49,105 L47,146 C43,150 37,150 34,146 C32,132 32,116 35,104 Z'),
  ...pair('calves', 'M35,156 C39,158 44,158 46,156 L45,194 C42,197 39,197 37,194 C35,182 34,168 35,156 Z'),
];

const BACK: Shape[] = [
  ...pair('shoulders', 'M30,44 C24,44 20,49 20,56 L28,58 C29,52 31,48 36,46 Z'),
  { muscle: 'back', d: 'M36,46 C42,44 58,44 64,46 C69,50 70,58 68,66 L63,92 C57,95 43,95 37,92 L32,66 C30,58 31,50 36,46 Z' },
  ...pair('triceps', 'M20,58 L28,60 C28,68 27,76 25,82 L18,80 C18,72 18,64 20,58 Z'),
  ...pair('glutes', 'M36,96 C41,94 47,95 49,97 L49,114 C44,118 37,117 34,112 C33,106 34,100 36,96 Z'),
  ...pair('hamstrings', 'M34,118 C39,121 45,121 48,119 L47,148 C43,151 37,151 35,148 C33,138 33,128 34,118 Z'),
  ...pair('calves', 'M35,154 C40,152 44,153 46,156 L45,192 C42,196 38,196 36,192 C34,180 33,166 35,154 Z'),
];

/** Conturul corpului: cap, trunchi, brațe, picioare. */
const SILHOUETTE =
  'M50,6 C57,6 61,11 61,18 C61,25 57,30 50,30 C43,30 39,25 39,18 C39,11 43,6 50,6 Z ' +
  'M44,31 L56,31 L57,38 C66,40 74,42 79,47 C82,52 82,60 82,70 L84,104 L78,105 L73,72 L69,66 L66,100 ' +
  'C67,110 67,118 65,128 L58,198 C58,206 56,212 52,213 L51,150 L49,150 L48,213 C44,212 42,206 42,198 L35,128 ' +
  'C33,118 33,110 34,100 L31,66 L27,72 L22,105 L16,104 L18,70 C18,60 18,52 21,47 C26,42 34,40 43,38 Z';

interface FigureProps {
  title: string;
  shapes: Shape[];
  fill: (muscle: Muscle) => string;
  describe: (muscle: Muscle) => string;
}

function Figure({ title, shapes, fill, describe }: FigureProps) {
  return (
    <figure className="flex flex-1 flex-col items-center gap-1">
      <svg viewBox="0 0 100 220" className="h-56 w-auto" role="img" aria-label={title}>
        <path d={SILHOUETTE} fill="rgba(248,250,252,0.06)" stroke="rgba(248,250,252,0.25)" strokeWidth="0.8" />
        {shapes.map((s, i) => (
          <path key={i} d={s.d} fill={fill(s.muscle)} stroke="rgba(15,23,42,0.6)" strokeWidth="0.6">
            <title>{`${MUSCLE_LABELS[s.muscle]}: ${describe(s.muscle)}`}</title>
          </path>
        ))}
      </svg>
      <figcaption className="text-sm text-steel/60">{title}</figcaption>
    </figure>
  );
}

interface Props {
  /** culoarea fiecărei grupe */
  fill: (muscle: Muscle) => string;
  /** textul pentru cititoarele de ecran și pentru apăsare lungă */
  describe: (muscle: Muscle) => string;
}

export function BodyMap({ fill, describe }: Props) {
  return (
    <div className="flex justify-center gap-2">
      <Figure title="Față" shapes={FRONT} fill={fill} describe={describe} />
      <Figure title="Spate" shapes={BACK} fill={fill} describe={describe} />
    </div>
  );
}

/** Culoare cu intensitate proporțională cu `t` (0..1), peste griul de bază. */
export function shade(hex: string, t: number): string {
  const v = Math.max(0, Math.min(1, t));
  if (v === 0) return 'rgba(248,250,252,0.10)';
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(0.25 + 0.75 * v).toFixed(2)})`;
}
