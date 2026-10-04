import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { LocalFoodEntry, Meal } from '../../lib/db';
import { cx } from '../../lib/cx';
import { MAX_ENTRY_GRAMS, rescaleEntry } from '../../lib/foodEdit';
import { formatNum, parseDecimal, toFieldString } from '../../lib/numbers';
import { changeEntryGrams, deleteEntry, MEALS, moveEntry } from '../../lib/nutritionOps';
import { Notice, Sheet, Stepper } from '../../components/ui';

interface Props {
  entry: LocalFoodEntry;
  onClose: () => void;
}

/** Un aliment din jurnal: alt gramaj (cu valorile recalculate), altă masă, ștergere. */
export function EntrySheet({ entry, onClose }: Props) {
  const [grams, setGrams] = useState(entry.grams ? toFieldString(entry.grams) : '');
  const [error, setError] = useState<string | null>(null);
  const g = parseDecimal(grams);
  const preview = entry.grams && g !== null ? rescaleEntry(entry, g) : null;
  const shown = preview ?? entry;

  const save = async () => {
    if (entry.grams && g !== entry.grams) {
      if (g === null || !(await changeEntryGrams(entry.id, g))) {
        return setError(`Cantitatea trebuie să fie între 1 și ${formatNum(MAX_ENTRY_GRAMS, 0)} de grame.`);
      }
    }
    onClose();
  };

  return (
    <Sheet title={entry.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {entry.grams ? (
          <Stepper label="Cantitate (grame)" value={grams} onChange={setGrams} step={10} min={0} max={MAX_ENTRY_GRAMS} />
        ) : (
          <p className="text-[15px] text-muted">
            {entry.amount_text || 'Fără cantitate'}. Gramajul se poate schimba doar la alimentele notate în grame.
          </p>
        )}

        <dl className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              ['kcal', shown.kcal],
              ['Proteine', shown.protein],
              ['Carbohidr.', shown.carbs],
              ['Grăsimi', shown.fat],
            ] as const
          ).map(([label, v]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="num text-2xl">{formatNum(v, 0)}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-2 text-[15px] text-muted">Masa</p>
          <div role="radiogroup" aria-label="Masa" className="grid grid-cols-4 gap-2">
            {MEALS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={entry.meal === m.id}
                className={cx(
                  'btn min-h-[44px] px-1 text-sm',
                  entry.meal === m.id ? 'bg-fg text-canvas' : 'bg-fg/[0.07] text-fg',
                )}
                onClick={() => void moveEntry(entry.id, m.id as Meal).then(onClose)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className="btn-primary" onClick={() => void save()}>
          Gata
        </button>
        <button
          type="button"
          className="btn min-h-[44px] text-danger"
          onClick={() => void deleteEntry(entry.id).then(onClose)}
        >
          <Trash2 size={18} aria-hidden="true" /> Șterge din jurnal
        </button>
      </div>
    </Sheet>
  );
}
