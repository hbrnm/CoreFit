import { DOMAIN, tone } from '../../../lib/domains';
import { formatNum } from '../../../lib/numbers';
import { SODIUM_LIMIT_MG } from '../../../lib/nutrition';
import { Notice, Panel } from '../../../components/ui';
import { Bar } from './Bar';

interface Props {
  totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number };
  targets: { kcal: number; protein: number; carbs: number; fat: number } | null;
  fiberTarget: number | null;
  sugarCap: number | null;
  goTo: (dest: any) => void;
}

export function DiarySummary({ totals, targets, fiberTarget, sugarCap, goTo }: Props) {
  const D = DOMAIN.nutrition;
  return (
    <Panel edge={D.edge}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">Calorii</p>
          <p className="num text-5xl leading-none">{formatNum(totals.kcal, 0)}</p>
        </div>
        {targets && (
          <div className="text-right">
            <p className="text-sm text-muted">{totals.kcal <= targets.kcal ? 'Rămase' : 'Peste țintă'}</p>
            <p className="num text-3xl leading-none">{formatNum(Math.abs(targets.kcal - totals.kcal), 0)}</p>
            <p className="text-xs text-subtle">din {formatNum(targets.kcal, 0)}</p>
          </div>
        )}
      </div>
      {targets && <div className="mt-3"><Bar value={totals.kcal} target={targets.kcal} color={tone('nutrition')} /></div>}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {(
          [
            ['Proteine', totals.protein, targets?.protein],
            ['Carbohidrați', totals.carbs, targets?.carbs],
            ['Grăsimi', totals.fat, targets?.fat],
          ] as const
        ).map(([label, value, target]) => (
          <div key={label}>
            <p className="text-sm text-muted">{label}</p>
            <p className="num text-xl leading-tight">
              {formatNum(value, 0)}
              {target ? <span className="text-base text-subtle"> / {target}</span> : null} g
            </p>
            {target ? <Bar value={value} target={target} color={tone('nutrition')} /> : null}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm text-muted">Fibre</p>
          <p className="num text-xl leading-tight">
            {formatNum(totals.fiber, 0)}
            {fiberTarget ? <span className="text-base text-subtle"> / {fiberTarget}</span> : null} g
          </p>
          {fiberTarget ? <Bar value={totals.fiber} target={fiberTarget} color={tone('nutrition')} /> : null}
        </div>
        <div>
          <p className="text-sm text-muted">Zaharuri</p>
          <p className="num text-xl leading-tight">
            {formatNum(totals.sugar, 0)}
            {sugarCap ? <span className="text-base text-subtle"> / {sugarCap}</span> : null} g
          </p>
          {sugarCap ? (
            <Bar value={totals.sugar} target={sugarCap} color={totals.sugar > sugarCap ? tone('danger') : tone('warning')} />
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs leading-snug text-subtle">
        Fibrele folosesc aportul adecvat IOM
        {fiberTarget ? ` (${fiberTarget} g)` : ''}. Zaharurile au plafon OMS de 10% din calorii, pentru zaharuri
        libere; aici numărăm zaharuri totale, deci e o limită de sus, nu o țintă.
      </p>
      <div className="mt-3">
        <p className="text-sm text-muted">Sodiu</p>
        <p className="num text-xl leading-tight">
          {formatNum(totals.sodium, 0)}
          <span className="text-base text-subtle"> / {formatNum(SODIUM_LIMIT_MG, 0)}</span> mg
        </p>
        <Bar value={totals.sodium} target={SODIUM_LIMIT_MG} color={totals.sodium > SODIUM_LIMIT_MG ? tone('danger') : tone('brand')} />
        <p className="mt-1 text-xs leading-snug text-subtle">
          Din Open Food Facts și din alimentele la care e notat. {formatNum(SODIUM_LIMIT_MG, 0)} mg e un plafon, nu o țintă.
        </p>
      </div>

      {!targets && (
        <div className="mt-3">
          <Notice
            tone="info"
            title="Fără țintă de calorii"
            action={
              <button type="button" className="btn-outline" onClick={() => goTo('profile')}>
                Completează în Profil
              </button>
            }
          >
            Pentru o țintă calculată am nevoie de sex, an de naștere, înălțime și o greutate notată (secțiunea Progres).
            Poți seta și o țintă manuală.
          </Notice>
        </div>
      )}
    </Panel>
  );
}
