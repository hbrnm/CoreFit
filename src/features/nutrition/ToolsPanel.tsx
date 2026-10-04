import { useState } from 'react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, type LocalNutritionLog } from '../../lib/db';
import { addDays, formatDayShort } from '../../lib/date';
import { checkIngredients, TOP_INGREDIENTS, type IngredientVerdict } from '../../lib/ingredients';
import { upsertDay } from '../../lib/nutritionOps';
import { cx } from '../../lib/cx';
import { Notice, Panel, Segmented } from '../../components/ui';


/** Durata promisiunii fără zahăr și făină. */
const PROMISE_DAYS = 66;

type DayState = 'clean' | 'slip' | 'none';

const stateOf = (r: LocalNutritionLog | undefined): DayState => {
  if (!r) return 'none';
  if (r.sugar_free_respected === false || r.flour_free_respected === false) return 'slip';
  if (r.sugar_free_respected === true && r.flour_free_respected === true) return 'clean';
  return 'none';
};

/** Zile consecutive curate, până azi. O zi de azi cu abatere resetează seria. */
function computeStreak(rows: LocalNutritionLog[], today: string): number {
  const byDate = new Map(rows.map((r) => [r.log_date, stateOf(r)]));
  if (byDate.get(today) === 'slip') return 0;
  // dacă azi nu e încă evaluat, seria de până ieri rămâne valabilă
  let cursor = byDate.get(today) === 'clean' ? today : addDays(today, -1);
  let streak = 0;
  while (byDate.get(cursor) === 'clean') {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function HitList({ verdict }: { verdict: IngredientVerdict }) {
  return (
    <ul className="list-inside list-disc">
      {verdict.hits.map((h) => (
        <li key={`${h.position}-${h.text}`}>
          Poziția {h.position}: {h.text}
        </li>
      ))}
    </ul>
  );
}

export function ToolsPanel() {
  const { userId } = useApp();
  const today = useToday();
  const { data: rows } = useLive(() => db.nutritionLogs.where('user_id').equals(userId).toArray(), [userId]);

  const list = rows ?? [];
  const byDate = new Map(list.map((r) => [r.log_date, r]));
  const streak = computeStreak(list, today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const todayState = stateOf(byDate.get(today));

  const [labelText, setLabelText] = useState('');
  const [verdict, setVerdict] = useState<IngredientVerdict | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Provocarea fără zahăr și făină">
        <p className="font-display text-5xl font-bold leading-none">
          Ziua {streak}
          <span className="ml-2 text-xl font-semibold text-subtle">din {PROMISE_DAYS}</span>
        </p>

        <ul className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Ultimele 7 zile">
          {week.map((date) => {
            const state = stateOf(byDate.get(date));
            return (
              <li key={date} className="flex flex-col items-center gap-1">
                <span
                  className={cx(
                    'h-8 w-full rounded-sm',
                    state === 'clean' && 'bg-success-solid',
                    state === 'slip' && 'bg-danger-solid',
                    state === 'none' && 'border border-dashed border-line-strong',
                  )}
                  role="img"
                  aria-label={`${formatDayShort(date)}: ${state === 'clean' ? 'zi curată' : state === 'slip' ? 'abatere' : 'nenotată'}`}
                />
                <span className="text-xs text-muted">{formatDayShort(date)}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-4">
          <p className="label">Cum a fost azi?</p>
          <Segmented<'clean' | 'slip'>
            label="Ziua de azi"
            options={[
              { value: 'clean', label: 'Curată' },
              { value: 'slip', label: 'Cu abatere' },
            ]}
            value={todayState === 'none' ? null : todayState}
            onChange={(v) => void upsertDay(userId, today, { sugar_free_respected: v === 'clean', flour_free_respected: v === 'clean' })}
          />
          <p className="mt-2 text-sm text-muted">Ziua nu se numără până nu o marchezi. Seria se resetează la o zi cu abatere.</p>
        </div>
      </Panel>

      <Panel title="Scaner de etichetă">
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="label-text" className="label">
              Lista de ingrediente de pe etichetă
            </label>
            <textarea
              id="label-text"
              rows={3}
              className="field py-2"
              placeholder="Făină de grâu, zahăr, ulei de palmier..."
              value={labelText}
              onChange={(e) => {
                setLabelText(e.target.value);
                setVerdict(null);
              }}
            />
          </div>
          <button type="button" onClick={() => setVerdict(checkIngredients(labelText))} disabled={labelText.trim() === ''} className="btn-primary">
            Verifică eticheta
          </button>

          {verdict?.verdict === 'reject' && (
            <Notice tone="error" title={`Respinsă: zahăr sau făină în primele ${TOP_INGREDIENTS} ingrediente`}>
              <HitList verdict={verdict} />
            </Notice>
          )}
          {verdict?.verdict === 'warn' && (
            <Notice tone="warn" title="Atenție: verifică aceste ingrediente">
              <HitList verdict={verdict} />
            </Notice>
          )}
          {verdict?.verdict === 'ok' && <Notice tone="ok">Nu am găsit zahăr sau făină în cele {verdict.total} ingrediente.</Notice>}
        </div>
      </Panel>
    </div>
  );
}
