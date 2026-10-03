import { Droplet, Plus, Utensils } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { addDays, formatDayMonth } from '../../lib/date';
import { DOMAIN, PLATE } from '../../lib/domains';
import { computeTargets, sumEntries, waterGoalMl, weightTrend } from '../../lib/nutrition';
import { entriesForDate, upsertDay } from '../../lib/nutritionOps';
import { formatNum } from '../../lib/numbers';
import { LineChart } from '../../components/charts';
import { WeeklyGoals } from '../../components/WeeklyGoals';
import { Panel } from '../../components/ui';
import { Bar } from '../nutrition/components/Bar';
import { TodayCard } from '../workouts/TodayCard';

const N = DOMAIN.nutrition;

/** Cât s-a mâncat și băut azi, față de ținte. Totul vine din jurnalul de nutriție. */
function TodayNutrition() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();

  const { data } = useLive(async () => {
    const [entries, day, logs] = await Promise.all([
      entriesForDate(userId, today),
      db.nutritionLogs.get([userId, today]),
      db.nutritionLogs.where('user_id').equals(userId).toArray(),
    ]);
    const latest = logs
      .filter((l) => l.body_weight_kg !== null && l.log_date <= today)
      .sort((a, b) => b.log_date.localeCompare(a.log_date))[0];
    return { eaten: sumEntries(entries).kcal, water: day?.water_ml ?? 0, weight: latest?.body_weight_kg ?? null };
  }, [userId, today]);

  if (!data) return null;
  const targets = computeTargets(profile, data.weight, Number(today.slice(0, 4)));
  const waterGoal = waterGoalMl(profile?.sex ?? null);

  return (
    <Panel title="Azi în nutriție" edge={N.edge}>
      <div className="flex flex-col gap-4">
        <button type="button" className="flex flex-col gap-1 text-left" onClick={() => goTo('nutrition')}>
          <span className="flex w-full items-center justify-between text-[15px]">
            <span className="flex items-center gap-2">
              <Utensils size={16} aria-hidden="true" /> Calorii
            </span>
            <span className="tabular-nums">
              {formatNum(data.eaten, 0)}
              {targets ? ` din ${formatNum(targets.kcal, 0)}` : ''} kcal
            </span>
          </span>
          {targets ? (
            <Bar value={data.eaten} target={targets.kcal} color={PLATE.yellow} />
          ) : (
            <span className="text-sm text-steel/60">Pentru o țintă, completează profilul și notează greutatea.</span>
          )}
        </button>
        <div className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-[15px]">
            <span className="flex items-center gap-2">
              <Droplet size={16} aria-hidden="true" /> Apă
            </span>
            <span className="tabular-nums">
              {formatNum(data.water, 0)} din {formatNum(waterGoal, 0)} ml
            </span>
          </span>
          <Bar value={data.water} target={waterGoal} color={PLATE.blue} />
          <button
            type="button"
            className="btn-quiet mt-1 self-start px-3"
            onClick={() => void upsertDay(userId, today, { water_ml: data.water + 250 })}
          >
            <Plus size={16} aria-hidden="true" /> 250 ml
          </button>
        </div>
      </div>
    </Panel>
  );
}

/** Greutatea pe ultimele 30 de zile, cu trendul netezit (cântarul variază zilnic cu apa și mesele). */
function WeightTrend() {
  const { userId } = useApp();
  const today = useToday();
  const { data: logs } = useLive(() => db.nutritionLogs.where('user_id').equals(userId).toArray(), [userId]);
  if (!logs) return null;

  const from = addDays(today, -29);
  const points = weightTrend(logs).filter((p) => p.date >= from && p.date <= today);
  return (
    <Panel title="Greutate, 30 de zile">
      {points.length < 2 ? (
        <p className="text-[15px] text-steel/70">Notează greutatea în Nutriție, Jurnal, în cel puțin două zile ca să vezi evoluția.</p>
      ) : (
        <>
          <LineChart
            points={points.map((p) => ({ label: formatDayMonth(p.date), y: Math.round(p.trend * 10) / 10 }))}
            secondary={points.map((p) => ({ label: formatDayMonth(p.date), y: p.kg }))}
            color={PLATE.green}
            unit="kg"
          />
          <p className="mt-2 text-sm text-steel/60">Linia groasă e trendul; cea subțire, ce ai notat zilnic.</p>
        </>
      )}
    </Panel>
  );
}

export function HomeTab() {
  const { profile, goTo } = useApp();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold leading-tight">
        Salut{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
      </h1>
      <TodayCard onStarted={() => goTo('workouts')} />
      <TodayNutrition />
      <WeeklyGoals color={PLATE.green} />
      <WeightTrend />
    </div>
  );
}
