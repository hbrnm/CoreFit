import { useState } from 'react';
import Dexie from 'dexie';
import { ChevronLeft, ChevronRight, ChevronRight as Chevron, Minus, Plus } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, stamp, type LocalFoodEntry, type Meal, type MealPlan } from '../../lib/db';
import { addDays, formatDateLong, formatDayMonth } from '../../lib/date';
import { cx } from '../../lib/cx';
import { entryLine } from '../../lib/foodEdit';
import { lastDays } from '../../lib/insights';
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
import { addEntry, copyDay, entriesForDate, intakeByDate, MEALS, repeatables, upsertDay, type Repeatable } from '../../lib/nutritionOps';
import { Notice, Sheet, SyncMark } from '../../components/ui';
import { NutritionNote } from '../../components/LongTermPanels';
import { AddFoodSheet } from './AddFoodSheet';
import { EntrySheet } from './EntrySheet';
import { DiarySummary } from './components/DiarySummary';
import { DiarySkeleton } from './components/DiarySkeleton';

/*
 * Jurnalul, în stilul C: sumarul ca un card de pe Acasă, apoi mesele ca listă, fără carduri.
 * Apăsarea pe un aliment deschide gramajul, masa și ștergerea.
 */
export function Diary() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<LocalFoodEntry | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [repeated, setRepeated] = useState<string | null>(null);

  const { data: entries, loaded: l1 } = useLive(() => entriesForDate(userId, date), [userId, date]);
  const { data: yesterday, loaded: l2 } = useLive(() => entriesForDate(userId, addDays(date, -1)), [userId, date]);
  const { data: again, loaded: l3 } = useLive(() => repeatables(userId, date), [userId, date]);
  const { data: dayRow, loaded: l4 } = useLive(() => db.nutritionLogs.get([userId, date]), [userId, date]);
  const { data: week, loaded: l5 } = useLive(() => intakeByDate(userId, addDays(date, -6), date), [userId, date]);
  const { data: latestWeight, loaded: l6 } = useLive(async () => {
    const latest = await db.nutritionLogs
      .where('[user_id+log_date]')
      .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
      .reverse()
      .filter((r) => r.body_weight_kg !== null)
      .first();
    return latest?.body_weight_kg ?? null;
  }, [userId]);

  if (!l1 || !l2 || !l3 || !l4 || !l5 || !l6) return <DiarySkeleton />;

  const list = entries ?? [];
  const totals = sumEntries(list);
  const targets = computeTargets(profile, latestWeight ?? null, new Date().getFullYear());
  const plan: MealPlan = profile?.meal_plan ?? 'standard';
  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const fiberTarget = fiberAdequateIntake(profile?.sex ?? null, age);
  const sugarCap = targets ? freeSugarCeilingGrams(targets.kcal) : null;
  const waterGoal = waterGoalMl(profile?.sex ?? null);
  const weekKcal = lastDays(date, 7).map((d) => Math.round(week?.get(d) ?? 0));
  const water = dayRow?.water_ml ?? 0;
  const isToday = date === today;

  const goDay = (next: string) => {
    setDate(next);
    setCopied(null);
    setRepeated(null);
  };

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

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-3 flex items-center justify-between">
        <button type="button" aria-label="Ziua anterioară" className="flex h-11 w-11 items-center justify-center text-subtle" onClick={() => goDay(addDays(date, -1))}>
          <ChevronLeft size={22} />
        </button>
        <button type="button" className="min-h-[44px] px-3 text-center" onClick={() => goDay(today)}>
          <span className="block text-[17px] font-semibold first-letter:uppercase">
            {isToday ? `Azi, ${formatDayMonth(date)}` : formatDateLong(`${date}T12:00:00`)}
          </span>
          {!isToday && <span className="block text-sm text-brand-fg">Înapoi la azi</span>}
        </button>
        <button
          type="button"
          aria-label="Ziua următoare"
          className="flex h-11 w-11 items-center justify-center text-subtle disabled:opacity-30"
          disabled={date >= today}
          onClick={() => goDay(addDays(date, 1))}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <DiarySummary
        totals={totals}
        targets={targets}
        fiberTarget={fiberTarget}
        sugarCap={sugarCap}
        week={weekKcal}
        when={isToday ? 'Azi' : formatDayMonth(date)}
        goTo={goTo}
      />
      <NutritionNote />

      {list.length === 0 && (yesterday ?? []).length > 0 && (
        <button type="button" className="btn-outline" onClick={async () => setCopied(await copyDay(userId, addDays(date, -1), date))}>
          Copiază mesele de ieri
        </button>
      )}
      {copied !== null && <Notice tone="ok">Am copiat {copied} alimente.</Notice>}
      {repeated && <Notice tone="ok">{repeated}</Notice>}

      <div className="border-t border-line">
        {MEALS.map((m) => {
          const items = list.filter((e) => e.meal === m.id);
          const sum = sumEntries(items);
          const share = MEAL_PLANS[plan].shares[m.id];
          const mealTarget = targets && share > 0 ? mealKcalTarget(targets.kcal, plan, m.id) : null;
          const over = mealTarget !== null && sum.kcal > mealTarget * 1.1;
          return (
            <section key={m.id} className="border-b border-line py-3" aria-label={m.label}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[20px] font-bold tracking-tight">{m.label}</h2>
                <span className="num text-[17px] font-normal text-subtle">
                  <span className={cx(over && 'text-warning')}>{formatNum(sum.kcal, 0)}</span>
                  {mealTarget ? ` / ${formatNum(mealTarget, 0)}` : ''} kcal
                </span>
              </div>
              <ul>
                {items.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="flex min-h-[44px] w-full items-center gap-3 py-1.5 text-left"
                      onClick={() => setEditing(e)}
                      aria-label={`${entryLine(e)}, ${formatNum(e.kcal, 0)} kcal. Schimbă`}
                    >
                      <span className="min-w-0 flex-1 text-[17px] text-muted">{entryLine(e)}</span>
                      <SyncMark status={e.sync_status} />
                      <span className="num shrink-0 text-[17px] font-normal">{formatNum(e.kcal, 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-subtle">
                  {items.length === 0 ? (share === 0 ? 'Nu intră în împărțirea zilei' : 'Nimic notat încă') : ''}
                </span>
                <button type="button" className="flex min-h-[44px] items-center gap-1 text-[17px] font-semibold text-brand-fg" onClick={() => setAdding(m.id)}>
                  <Plus size={18} aria-hidden="true" /> Adaugă
                  <span className="sr-only"> la {m.label.toLowerCase()}</span>
                </button>
              </div>
            </section>
          );
        })}

        <section className="border-b border-line py-3" aria-label="Apă">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">Apă</h2>
              <p className="num text-[15px] font-normal text-subtle">
                {formatNum(water, 0)} din {formatNum(waterGoal, 0)} ml
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Scade 250 ml"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-fg/[0.07] disabled:opacity-40"
                disabled={water <= 0}
                onClick={() => void upsertDay(userId, date, { water_ml: Math.max(0, water - 250) })}
              >
                <Minus size={18} />
              </button>
              <button
                type="button"
                className="flex h-11 items-center gap-1 rounded-full bg-fg/[0.07] px-4 text-[15px] font-semibold"
                onClick={() => void upsertDay(userId, date, { water_ml: water + 250 })}
              >
                <Plus size={18} aria-hidden="true" /> 250 ml
              </button>
            </div>
          </div>
        </section>
      </div>

      {(again ?? []).length > 0 && (
        <section aria-label="Din nou">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">Din nou</h2>
          <ul className="mt-1">
            {(again ?? []).slice(0, 6).map((item) => (
              <li key={item.key} className="border-b border-line last:border-b-0">
                <button type="button" className="flex min-h-[52px] w-full items-center gap-3 py-2 text-left" onClick={() => void repeat(item)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">{item.name}</span>
                    <span className="block text-sm text-subtle">
                      {item.amountText} · {MEALS.find((x) => x.id === item.meal)?.label}
                      {item.yesterday ? ' · ieri' : item.times > 1 ? ` · de ${item.times} ori` : ''}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[17px] font-normal">{formatNum(item.totals.kcal, 0)}</span>
                  <Plus size={18} className="shrink-0 text-brand-fg" aria-label="Adaugă din nou" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="flex min-h-[48px] items-center justify-between border-t border-line pt-1 text-left" onClick={() => setPlanOpen(true)}>
        <span>
          <span className="block text-[17px]">Împărțirea zilei</span>
          <span className="block text-sm text-subtle">{MEAL_PLANS[plan].label}</span>
        </span>
        <Chevron size={18} className="text-subtle" aria-hidden="true" />
      </button>

      {planOpen && (
        <Sheet title="Împărțirea zilei" onClose={() => setPlanOpen(false)}>
          <div role="radiogroup" aria-label="Împărțirea caloriilor pe mese" className="flex flex-col">
            {MEAL_PLAN_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={id === plan}
                onClick={() => setPlan(id)}
                className="flex min-h-[52px] items-center justify-between border-b border-line py-2 text-left last:border-b-0"
              >
                <span>
                  <span className="block text-[17px] font-semibold">{MEAL_PLANS[id].label}</span>
                  <span className="block text-sm text-subtle">{MEAL_PLANS[id].hint}</span>
                </span>
                {id === plan && <span className="text-brand-fg">✓</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">Ținta fiecărei mese se schimbă; alimentele notate nu se mută singure.</p>
        </Sheet>
      )}
      {adding && <AddFoodSheet date={date} meal={adding} onClose={() => setAdding(null)} />}
      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
