import { useState } from 'react';
import Dexie from 'dexie';
import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, stamp, type Meal, type MealPlan } from '../../lib/db';
import { addDays, formatDateLong } from '../../lib/date';
import { DOMAIN, PLATE } from '../../lib/domains';
import { cx } from '../../lib/cx';
import { formatNum } from '../../lib/numbers';
import {
  computeTargets,
  fiberAdequateIntake,
  freeSugarCeilingGrams,
  MEAL_PLAN_ORDER,
  MEAL_PLANS,
  mealKcalTarget,
  sumEntries,
  waterGoalMl,
} from '../../lib/nutrition';
import { addEntry, copyDay, deleteEntry, entriesForDate, MEALS, moveEntry, repeatables, upsertDay, type Repeatable } from '../../lib/nutritionOps';
import { Notice, Panel, SyncMark } from '../../components/ui';
import { NutritionNote } from '../../components/LongTermPanels';
import { AddFoodSheet } from './AddFoodSheet';
import { DiarySummary } from './components/DiarySummary';
import { DiarySkeleton } from './components/DiarySkeleton';
import { Bar } from './components/Bar';

const D = DOMAIN.nutrition;

export function Diary() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [repeated, setRepeated] = useState<string | null>(null);

  const { data: entries, loaded: l1 } = useLive(() => entriesForDate(userId, date), [userId, date]);
  const { data: yesterday, loaded: l2 } = useLive(() => entriesForDate(userId, addDays(date, -1)), [userId, date]);
  const { data: again, loaded: l3 } = useLive(() => repeatables(userId, date), [userId, date]);
  const { data: dayRow, loaded: l4 } = useLive(() => db.nutritionLogs.get([userId, date]), [userId, date]);
  const { data: latestWeight, loaded: l5 } = useLive(async () => {
    const latest = await db.nutritionLogs
      .where('[user_id+log_date]')
      .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
      .reverse()
      .filter((r) => r.body_weight_kg !== null)
      .first();
    return latest?.body_weight_kg ?? null;
  }, [userId]);

  if (!l1 || !l2 || !l3 || !l4 || !l5) return <DiarySkeleton />;

  const list = entries ?? [];
  const totals = sumEntries(list);
  const targets = computeTargets(profile, latestWeight ?? null, new Date().getFullYear());
  const plan: MealPlan = profile?.meal_plan ?? 'standard';
  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const fiberTarget = fiberAdequateIntake(profile?.sex ?? null, age);
  const sugarCap = targets ? freeSugarCeilingGrams(targets.kcal) : null;
  const waterGoal = waterGoalMl(profile?.sex ?? null);

  const setPlan = (next: MealPlan) => {
    if (!profile || next === plan) return;
    void db.profiles.put({ ...profile, meal_plan: next, ...stamp() });
  };

  const repeat = async (item: Repeatable) => {
    await addEntry(userId, date, item.meal, item.name, item.amountText, item.totals, item.source);
    const mealLabel = MEALS.find((m) => m.id === item.meal)?.label.toLowerCase() ?? '';
    setRepeated(`Am pus ${item.name} la ${mealLabel}.`);
    setCopied(null);
  };

  const water = dayRow?.water_ml ?? 0;
  const isToday = date === today;

  return (
    <div className="flex flex-col gap-4">
      <NutritionNote />
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Ziua anterioară"
          className="flex h-12 w-12 items-center justify-center"
          onClick={() => {
            setDate(addDays(date, -1));
            setCopied(null);
            setRepeated(null);
          }}
        >
          <ChevronLeft size={22} />
        </button>
        <button type="button" className="min-h-[44px] px-3 text-center" onClick={() => setDate(today)}>
          <span className="block font-display text-xl font-bold capitalize">{isToday ? 'Azi' : formatDateLong(`${date}T12:00:00`)}</span>
          {!isToday && <span className="block text-sm text-plate-green">Înapoi la azi</span>}
        </button>
        <button
          type="button"
          aria-label="Ziua următoare"
          className="flex h-12 w-12 items-center justify-center disabled:opacity-30"
          disabled={date >= today}
          onClick={() => {
            setDate(addDays(date, 1));
            setCopied(null);
            setRepeated(null);
          }}
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <DiarySummary totals={totals} targets={targets} fiberTarget={fiberTarget} sugarCap={sugarCap} goTo={goTo} />

      {list.length === 0 && (yesterday ?? []).length > 0 && (
        <button
          type="button"
          className="btn-outline"
          onClick={async () => setCopied(await copyDay(userId, addDays(date, -1), date))}
        >
          Copiază mesele de ieri
        </button>
      )}
      {copied !== null && <Notice tone="ok">Am copiat {copied} alimente.</Notice>}
      {repeated && <Notice tone="ok">{repeated}</Notice>}

      {(again ?? []).length > 0 && (
        <Panel title="Din nou">
          <ul className="flex flex-col gap-2">
            {(again ?? []).map((item) => (
              <li key={item.key}>
                <button type="button" className="btn-quiet w-full justify-between px-3 text-left" onClick={() => void repeat(item)}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="block text-sm font-normal text-steel/60">
                      {item.amountText} · {MEALS.find((m) => m.id === item.meal)?.label}
                      {item.yesterday ? ' · ieri' : item.times > 1 ? ` · de ${item.times} ori` : ''}
                    </span>
                  </span>
                  <span className="num shrink-0 text-lg">{formatNum(item.totals.kcal, 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Împărțirea zilei">
        <div role="radiogroup" aria-label="Împărțirea caloriilor pe mese" className="grid grid-cols-2 gap-2">
          {MEAL_PLAN_ORDER.map((id) => {
            const selected = id === plan;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPlan(id)}
                className={cx(
                  'btn min-h-[44px] px-2 text-sm',
                  selected ? D.solid : 'btn-outline',
                )}
              >
                {MEAL_PLANS[id].label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-steel/60">{MEAL_PLANS[plan].hint} Alimentele nu se mută singure.</p>
      </Panel>

      {MEALS.map((m) => {
        const items = list.filter((e) => e.meal === m.id);
        const sum = sumEntries(items);
        const share = MEAL_PLANS[plan].shares[m.id];
        const mealTarget = targets && share > 0 ? mealKcalTarget(targets.kcal, plan, m.id) : null;
        return (
          <Panel
            key={m.id}
            title={m.label}
            aside={
              <span className="num text-lg text-steel/70">
                {formatNum(sum.kcal, 0)}
                {mealTarget ? ` / ${formatNum(mealTarget, 0)}` : ''} kcal
              </span>
            }
          >
            {mealTarget ? (
              <div className="mb-2">
                <Bar value={sum.kcal} target={mealTarget} color={sum.kcal > mealTarget ? PLATE.yellow : PLATE.green} />
              </div>
            ) : (
              share === 0 && (
                <p className="mb-2 text-sm text-steel/60">Nu intră în plan. Poți nota aici sau muta alimentul la o masă din plan.</p>
              )
            )}
            <ul className="divide-y divide-white/10">
              {items.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.name}</p>
                    <p className="text-sm text-steel/60">
                      {e.amount_text}, {formatNum(e.kcal, 0)} kcal, P {formatNum(e.protein, 0)} C {formatNum(e.carbs, 0)} G{' '}
                      {formatNum(e.fat, 0)}
                    </p>
                  </div>
                  <SyncMark status={e.sync_status} />
                  <select
                    aria-label={`Mută ${e.name} la altă masă`}
                    className="h-11 max-w-[6.5rem] shrink-0 rounded-lg border border-white/10 bg-white/5 px-1 text-sm text-steel"
                    value={e.meal}
                    onChange={(ev) => void moveEntry(e.id, ev.target.value as Meal)}
                  >
                    {MEALS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Șterge ${e.name}`}
                    className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-steel/50 active:text-plate-red"
                    onClick={() => void deleteEntry(e.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={`btn mt-2 w-full ${D.solid}`} onClick={() => setAdding(m.id)}>
              <Plus size={18} />
              Adaugă
            </button>
          </Panel>
        );
      })}

      <Panel title="Apă" aside={<span className="num text-lg text-steel/70">{formatNum(water, 0)} / {waterGoal} ml</span>}>
        <Bar value={water} target={waterGoal} color={PLATE.blue} />
        <p className="mt-2 text-sm text-steel/60">Țintă de apă de băut, fără lichidul din mâncare.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="btn-quiet"
            disabled={water <= 0}
            onClick={() => void upsertDay(userId, date, { water_ml: Math.max(0, water - 250) })}
          >
            <Minus size={18} />
            250 ml
          </button>
          <button type="button" className={`btn ${D.solid}`} onClick={() => void upsertDay(userId, date, { water_ml: water + 250 })}>
            <Plus size={18} />
            250 ml
          </button>
        </div>
      </Panel>

      {adding && <AddFoodSheet date={date} meal={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
