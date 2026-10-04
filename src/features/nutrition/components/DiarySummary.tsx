import { useState } from 'react';
import { Apple, ChevronDown } from 'lucide-react';
import { kcalLeftText } from '../../../lib/foodEdit';
import { tone } from '../../../lib/domains';
import { formatNum } from '../../../lib/numbers';
import { SODIUM_LIMIT_MG } from '../../../lib/nutrition';
import { BigValue, HealthCard, MiniBars } from '../../../components/HealthCard';
import { Bar } from './Bar';

interface Props {
  totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number };
  targets: { kcal: number; protein: number; carbs: number; fat: number } | null;
  fiberTarget: number | null;
  sugarCap: number | null;
  /** caloriile din ultimele 7 zile, ziua afișată ultima */
  week: readonly number[];
  /** „Azi” sau data scurtă */
  when: string;
  goTo: (dest: any) => void;
}

/*
 * Sumarul zilei, cu aceeași anatomie ca un card de pe Acasă: caloriile mari, ce a rămas,
 * barele pe 7 zile, apoi macro. Fibrele, zaharurile și sodiul stau sub „Mai mult”.
 */
export function DiarySummary({ totals, targets, fiberTarget, sugarCap, week, when, goTo }: Props) {
  const [more, setMore] = useState(false);
  const macros = [
    ['Proteine', totals.protein, targets?.protein],
    ['Carbohidrați', totals.carbs, targets?.carbs],
    ['Grăsimi', totals.fat, targets?.fat],
  ] as const;

  return (
    <HealthCard category="nutrition" icon={Apple} label="Calorii" when={when}>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <BigValue value={formatNum(totals.kcal, 0)} unit="kcal" />
          <p className="mt-1.5 text-[15px] text-muted">
            {targets ? kcalLeftText(totals.kcal, targets.kcal) : 'Fără țintă încă'}
          </p>
        </div>
        {week.some((k) => k > 0) && <MiniBars values={week} category="nutrition" label="Caloriile din ultimele 7 zile" />}
      </div>

      <div className="my-3 h-px bg-line" />
      <dl className="grid grid-cols-3 gap-2">
        {macros.map(([label, value, target], i) => (
          <div key={label}>
            <dd className="num text-[22px] leading-tight">
              {formatNum(value, 0)}
              <span className="text-[15px] font-normal text-subtle">{target ? ` / ${formatNum(target, 0)} g` : ' g'}</span>
            </dd>
            <dt className="mt-0.5 flex items-center gap-1.5 text-[15px] text-muted">
              <span className="h-[3px] w-3 rounded-sm" style={{ background: tone('fg', 1 - i * 0.3) }} aria-hidden="true" />
              {label}
            </dt>
          </div>
        ))}
      </dl>

      <button
        type="button"
        className="-mb-2 mt-2 flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-brand-fg"
        aria-expanded={more}
        onClick={() => setMore((m) => !m)}
      >
        {more ? 'Mai puțin' : 'Fibre, zaharuri, sodiu'}
        <ChevronDown size={16} className={more ? 'rotate-180' : ''} aria-hidden="true" />
      </button>

      {more && (
        <div className="mt-3 flex flex-col gap-3">
          <Row label="Fibre" value={totals.fiber} target={fiberTarget} unit="g" color={tone('nutrition')} />
          <Row
            label="Zaharuri"
            value={totals.sugar}
            target={sugarCap}
            unit="g"
            color={sugarCap && totals.sugar > sugarCap ? tone('danger') : tone('warning')}
          />
          <Row
            label="Sodiu"
            value={totals.sodium}
            target={SODIUM_LIMIT_MG}
            unit="mg"
            color={totals.sodium > SODIUM_LIMIT_MG ? tone('danger') : tone('subtle')}
          />
          <p className="text-[13px] leading-snug text-subtle">
            Fibrele folosesc aportul adecvat IOM{fiberTarget ? ` (${fiberTarget} g)` : ''}. Zaharurile au plafonul OMS de 10% din
            calorii, pentru zaharuri libere; aici numărăm zaharurile totale, deci e o limită de sus, nu o țintă. Sodiul vine din
            Open Food Facts și din alimentele la care e notat; {formatNum(SODIUM_LIMIT_MG, 0)} mg e un plafon.
          </p>
        </div>
      )}

      {!targets && (
        <p className="mt-3 text-[15px] text-muted">
          Pentru o țintă calculată am nevoie de sex, an de naștere, înălțime și o greutate notată.{' '}
          <button type="button" className="font-semibold text-brand-fg" onClick={() => goTo('profile')}>
            Completează profilul
          </button>
        </p>
      )}
    </HealthCard>
  );
}

function Row({ label, value, target, unit, color }: { label: string; value: number; target: number | null; unit: string; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] text-muted">{label}</span>
        <span className="num text-[17px]">
          {formatNum(value, 0)}
          <span className="text-[15px] font-normal text-subtle">{target ? ` / ${formatNum(target, 0)} ${unit}` : ` ${unit}`}</span>
        </span>
      </div>
      {target ? (
        <div className="mt-1">
          <Bar value={value} target={target} color={color} />
        </div>
      ) : null}
    </div>
  );
}
