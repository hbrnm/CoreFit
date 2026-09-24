import { useState } from 'react';
import { DOMAIN } from '../../lib/domains';
import { formatNum, parseDecimal, toFieldString } from '../../lib/numbers';
import { fromPer100 } from '../../lib/nutrition';
import { Notice, Stepper } from '../../components/ui';
import type { PickedFood } from './FoodSearch';

const D = DOMAIN.nutrition;

interface Props {
  food: PickedFood;
  confirmLabel: string;
  onConfirm: (grams: number) => void;
  onBack: () => void;
}

/** Cantitatea în grame, cu previzualizarea valorilor nutriționale. */
export function AmountStep({ food, confirmLabel, onConfirm, onBack }: Props) {
  const [grams, setGrams] = useState(toFieldString(food.servingG ?? 100));
  const [error, setError] = useState<string | null>(null);

  const g = parseDecimal(grams) ?? 0;
  const t = fromPer100(food.per100, g);

  const confirm = () => {
    if (g <= 0 || g > 5000) return setError('Cantitatea trebuie să fie între 1 și 5000 de grame.');
    onConfirm(g);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-display text-2xl font-bold leading-tight">{food.name}</p>
        {food.brand && <p className="text-steel/70">{food.brand}</p>}
      </div>

      <Stepper label="Cantitate (grame)" value={grams} onChange={setGrams} step={10} min={0} max={5000} />

      {food.servingG && (
        <div className="grid grid-cols-3 gap-2">
          {[0.5, 1, 2].map((m) => (
            <button
              key={m}
              type="button"
              className="btn-quiet min-h-[44px] px-2 text-sm"
              onClick={() => setGrams(toFieldString((food.servingG ?? 100) * m))}
            >
              {m === 1 ? '1 porție' : `${m} porții`}
            </button>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-4 gap-2 text-center">
        <div>
          <dt className="text-sm text-steel/60">kcal</dt>
          <dd className="num text-2xl">{formatNum(t.kcal, 0)}</dd>
        </div>
        <div>
          <dt className="text-sm text-steel/60">Proteine</dt>
          <dd className="num text-2xl">{formatNum(t.protein)}</dd>
        </div>
        <div>
          <dt className="text-sm text-steel/60">Carbo</dt>
          <dd className="num text-2xl">{formatNum(t.carbs)}</dd>
        </div>
        <div>
          <dt className="text-sm text-steel/60">Grăsimi</dt>
          <dd className="num text-2xl">{formatNum(t.fat)}</dd>
        </div>
      </dl>
      {t.sodium > 0 && <p className="text-sm text-steel/70">Sodiu {formatNum(t.sodium, 0)} mg</p>}

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-quiet" onClick={onBack}>
          Înapoi
        </button>
        <button type="button" className={`btn ${D.solid}`} onClick={confirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
