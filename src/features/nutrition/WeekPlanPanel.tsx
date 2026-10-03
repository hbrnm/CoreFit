import { useMemo, useState } from 'react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, type MealPlan } from '../../lib/db';
import { formatDayMonth, formatWeekdayShort, weekDates } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { buildWeek, portionLines, portionWeight, shoppingList, type PlannedDay, type PlannedSlot } from '../../lib/mealPlan';
import { formatNum } from '../../lib/numbers';
import { computeTargets, mealKcalTarget } from '../../lib/nutrition';
import { addEntry, entriesForDate, MEALS } from '../../lib/nutritionOps';
import { CheckRow, Notice, Panel } from '../../components/ui';

const D = DOMAIN.nutrition;

const MEAL_LABEL = new Map(MEALS.map((meal) => [meal.id, meal.label]));

function portionLabel(portions: number): string {
  const text = formatNum(portions);
  return portions === 1 ? `${text} porție` : `${text} porții`;
}

function amountText(slot: PlannedSlot): string {
  return `${portionLabel(slot.portions)}, circa ${formatNum(portionWeight(slot), 0)} g`;
}

export function WeekPlanPanel() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();
  const { data: latestWeight, loaded } = useLive(async () => {
    const rows = await db.nutritionLogs.where('user_id').equals(userId).toArray();
    const withWeight = rows.filter((row) => row.body_weight_kg !== null).sort((a, b) => b.log_date.localeCompare(a.log_date));
    return withWeight[0]?.body_weight_kg ?? null;
  }, [userId]);

  const plan: MealPlan = profile?.meal_plan ?? 'standard';
  const dates = weekDates(today, profile?.week_starts_on ?? 'monday');
  const targets = loaded ? computeTargets(profile, latestWeight ?? null, new Date().getFullYear()) : null;
  const dateKey = dates.join(',');
  const days = useMemo(
    () =>
      buildWeek({
        dates: dateKey.split(','),
        mealPlan: plan,
        kcalTarget: targets?.kcal ?? null,
        proteinTarget: targets?.protein ?? null,
      }),
    [dateKey, plan, targets?.kcal, targets?.protein],
  );
  const shop = useMemo(() => shoppingList(days), [days]);

  const [selected, setSelected] = useState(dates.includes(today) ? today : dates[0]);
  const [bought, setBought] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const day = days.find((item) => item.date === selected) ?? days[0];
  const snackKcal = targets ? mealKcalTarget(targets.kcal, plan, 'snack') : 0;
  const groups = shop.reduce<Array<{ category: string; lines: typeof shop }>>((acc, line) => {
    const last = acc[acc.length - 1];
    if (!last || last.category !== line.category) acc.push({ category: line.category, lines: [line] });
    else last.lines.push(line);
    return acc;
  }, []);

  const logDay = async (item: PlannedDay) => {
    const existing = await entriesForDate(userId, item.date);
    if (existing.length > 0 && !window.confirm('Ziua are deja alimente. Le adaug pe lângă cele notate?')) return;
    setBusy(true);
    try {
      for (const slot of item.slots) {
        await addEntry(userId, item.date, slot.meal, slot.recipe.name, amountText(slot), slot.totals, 'recipe');
      }
      setNote('Am pus ziua în jurnal. O vezi la Jurnal.');
    } catch {
      setNote('Ziua nu s-a putut nota.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Plan pe 7 zile" edge={D.edge}>
        <p className="text-[15px] text-steel/80">
          O porție este rețeta împărțită la câte porții iese. 1,5 porții înseamnă o porție și jumătate din oală. Gramele
          includ apa de gătit. La cuptor se pierde apă, deci farfuria cântărește mai puțin. Nu e un plan medical.
        </p>
        {!loaded && <p className="mt-3 text-steel/70">Se încarcă.</p>}
        {loaded && !targets && (
          <div className="mt-3">
            <Notice
              tone="info"
              action={
                <button type="button" className="btn-outline" onClick={() => goTo('profile')}>
                  Completează în Profil
                </button>
              }
            >
              Fără sex, vârstă, înălțime și o greutate, fiecare masă rămâne o porție.
            </Notice>
          </div>
        )}
        {loaded && targets && (
          <p className="mt-3 text-[15px]">
            Țintă: {formatNum(targets.kcal, 0)} kcal și {formatNum(targets.protein, 0)} g proteine pe zi.
            {snackKcal > 0 ? ` Gustarea, circa ${formatNum(snackKcal, 0)} kcal, rămâne la alegerea ta.` : ''}
          </p>
        )}
      </Panel>

      {loaded && day && (
        <Panel
          title={day.date === today ? 'Azi' : formatDayMonth(day.date)}
          edge={D.edge}
          aside={<span className="text-sm capitalize text-steel/60">{formatWeekdayShort(day.date)}</span>}
        >
          <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Zilele săptămânii">
            {days.map((item) => {
              const on = item.date === day.date;
              return (
                <button
                  key={item.date}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`flex min-h-[52px] flex-col items-center justify-center px-0.5 text-sm capitalize ${on ? D.solid : 'border border-white/10 bg-white/5'}`}
                  onClick={() => {
                    setSelected(item.date);
                    setNote(null);
                  }}
                >
                  <span>{formatWeekdayShort(item.date).replace('.', '')}</span>
                  <span className="num">{item.date.slice(8)}</span>
                </button>
              );
            })}
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {day.slots.map((slot) => (
              <li key={slot.meal}>
                <p className="text-sm text-steel/60">{MEAL_LABEL.get(slot.meal)}</p>
                <p className="font-semibold">{slot.recipe.name}</p>
                <p className="text-[15px]">{amountText(slot)}</p>
                <p className="text-[15px]">
                  {formatNum(slot.totals.kcal, 0)} kcal, {formatNum(slot.totals.protein, 0)} g proteine, {formatNum(slot.totals.fiber, 0)} g fibre
                </p>
                <ul className="mt-1 text-[15px] text-steel/80">
                  {portionLines(slot).map((line) => (
                    <li key={`${slot.meal}-${line.name}`}>
                      {line.name}, {formatNum(line.grams, 0)} g
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[15px]">
            Ziua din plan: {formatNum(day.totals.kcal, 0)} kcal, {formatNum(day.totals.protein, 0)} g proteine
            {targets ? `, din ${formatNum(targets.kcal, 0)} kcal și ${formatNum(targets.protein, 0)} g.` : '.'}
          </p>
          {targets && targets.kcal - snackKcal - day.totals.kcal > 300 && (
            <p className="mt-1 text-[15px] text-steel/70">
              Mai rămân circa {formatNum(targets.kcal - snackKcal - day.totals.kcal, 0)} kcal. Le poți acoperi cu pâine, iaurt sau fructe.
            </p>
          )}

          <div className="mt-3">
            <button type="button" className={`btn min-h-[44px] w-full ${D.solid}`} disabled={busy} onClick={() => void logDay(day)}>
              Pune ziua în jurnal
            </button>
          </div>
          {note && (
            <div className="mt-3">
              <Notice tone="info">{note}</Notice>
            </div>
          )}
        </Panel>
      )}

      {loaded && (
        <Panel title="Cumpărături" edge={D.edge}>
          <p className="text-[15px] text-steel/80">Pentru toată săptămâna, la porțiile de mai sus. Bifele rămân pe acest ecran.</p>
          {groups.map((group) => (
            <div key={group.category} className="mt-3">
              <h3 className="font-semibold">{group.category}</h3>
              {group.lines.map((line) => (
                <CheckRow
                  key={line.name}
                  checked={bought.has(line.name)}
                  accent={D.accent}
                  onChange={(checked) => {
                    setBought((current) => {
                      const next = new Set(current);
                      if (checked) next.add(line.name);
                      else next.delete(line.name);
                      return next;
                    });
                  }}
                >
                  {line.name}, {formatNum(line.grams, 0)} g
                </CheckRow>
              ))}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

