import { Activity, Apple, Check, ChevronRight, Droplet, Flame, Plus, Scale } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { addDays, formatDateLong, formatDayMonth } from '../../lib/date';
import { kcalByDay, kcalInsight, lastDays, strengthInsight, strengthPerWeek, weightChange } from '../../lib/insights';
import { computeTargets, waterGoalMl, weightTrend } from '../../lib/nutrition';
import { upsertDay } from '../../lib/nutritionOps';
import { formatNum } from '../../lib/numbers';
import { kcalLeftText } from '../../lib/foodEdit';
import { weekStartOf } from '../../lib/schedule';
import { requestHealthProgram } from '../../lib/intents';
import { BigValue, DotsChart, HealthCard, MiniBars, Sparkline, WeekBars } from '../../components/HealthCard';
import { TodayCard } from '../workouts/TodayCard';

/*
 * Acasă, în stilul Apple Health: „Azi” (ce faci acum) și „Tendințe” (ce spun ultimele săptămâni),
 * cu carduri care au aceeași anatomie. Pentru un cont nou, „Primii pași” în loc de tendințe.
 */

/** Zile de forță pe săptămână față de care se măsoară seria (recomandarea OMS 2020, ca în „Săptămâna aceasta”). */
const STRENGTH_TARGET = 2;
/** Programul de sănătate pornit din cardul „Mișcare”. */
const MOVE_PROGRAM = 'desk-break';

function useHomeData() {
  const { userId } = useApp();
  const today = useToday();
  return useLive(async () => {
    const from = addDays(today, -27);
    const [entries, logs, sessions, routines, health] = await Promise.all([
      db.foodEntries
        .where('[user_id+log_date]')
        .between([userId, from], [userId, today], true, true)
        .filter((e) => !e.deleted)
        .toArray(),
      db.nutritionLogs.where('user_id').equals(userId).toArray(),
      db.workoutSessions
        .where('[user_id+started_at]')
        .between([userId, addDays(today, -70)], [userId, '￿'])
        .filter((s) => !s.deleted)
        .toArray(),
      db.routines
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .count(),
      db.healthSessions
        .where('[user_id+completed_at]')
        .between([userId, ''], [userId, '￿'])
        .filter((h) => !h.deleted)
        .last(),
    ]);
    return { entries, logs, sessions, routines, lastHealth: health ?? null };
  }, [userId, today]);
}

function daysAgo(iso: string, today: string): string {
  const n = Math.round((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 86_400_000);
  if (n <= 0) return 'azi';
  if (n === 1) return 'ieri';
  return `acum ${n} zile`;
}

export function HomeTab() {
  const { userId, profile, cloud, goTo } = useApp();
  const today = useToday();
  const { data } = useHomeData();
  if (!data || !profile) return null;

  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? '';
  const days7 = lastDays(today, 7);
  const days28 = lastDays(today, 28);
  const kcal7 = kcalByDay(data.entries, days7);
  const kcal28 = kcalByDay(data.entries, days28);
  const todayLog = data.logs.find((l) => l.log_date === today);
  const water = todayLog?.water_ml ?? 0;
  const waterGoal = waterGoalMl(profile.sex);
  const trend = weightTrend(data.logs.filter((l) => l.log_date <= today));
  const latest = trend[trend.length - 1] ?? null;
  const targets = computeTargets(profile, latest?.kg ?? null, Number(today.slice(0, 4)));
  const month = trend.filter((p) => p.date >= addDays(today, -30));
  const change = weightChange(trend, addDays(today, -30), today);

  const kcalTrend = kcalInsight(kcal28, targets?.kcal ?? null);
  const perWeek = strengthPerWeek(data.sessions, today, weekStartOf(profile), 8);
  const strength = strengthInsight(perWeek, STRENGTH_TARGET);

  const profileDone = profile.sex !== null && profile.birth_year !== null && profile.height_cm !== null;
  const firstDay = data.routines === 0 && data.entries.length === 0 && latest === null;

  const steps = [
    {
      done: true,
      title: cloud ? 'Contul e gata' : 'Aplicația e gata',
      text: cloud ? 'Datele tale se sincronizează pe toate dispozitivele.' : 'Datele rămân pe acest telefon.',
      go: undefined,
    },
    { done: data.routines > 0, title: 'Alege o rutină', text: 'Un șablon gata făcut sau una a ta. Apoi o pui pe zilele săptămânii.', go: () => goTo('workouts') },
    { done: profileDone, title: 'Completează profilul', text: 'Sex, an naștere, înălțime: din ele calculăm ținta de calorii.', go: () => goTo('profile') },
    { done: latest !== null, title: 'Notează greutatea', text: 'O dată pe zi, dimineața. Trendul apare după două zile.', go: () => goTo('nutrition') },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between pt-1">
        <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-subtle">{formatDateLong(`${today}T12:00:00`)}</span>
        <button
          type="button"
          onClick={() => goTo('profile')}
          aria-label="Profil"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-raised font-bold text-muted"
        >
          {(firstName[0] ?? '·').toUpperCase()}
        </button>
      </div>
      <h1 className="-mt-2 font-display text-[32px] font-extrabold leading-tight tracking-tight">
        {firstDay ? 'Bun venit' : 'Bună'}
        {firstName ? `, ${firstName}` : ''}
      </h1>

      {firstDay && (
        <>
          <h2 className="mx-1 mt-2 text-[22px] font-extrabold tracking-tight">Primii pași</h2>
          <section className="panel px-4 py-1">
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                disabled={!s.go || s.done}
                onClick={s.go}
                className="flex w-full items-center gap-3.5 border-t border-line py-3.5 text-left first:border-t-0 disabled:opacity-100"
              >
                <span
                  className={
                    s.done
                      ? 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-fg text-surface'
                      : 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-line-strong text-sm font-bold text-muted'
                  }
                >
                  {s.done ? <Check size={16} strokeWidth={3} aria-label="Făcut" /> : i + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{s.text}</span>
                </span>
                {!s.done && s.go && <ChevronRight size={18} className="text-subtle" aria-hidden="true" />}
              </button>
            ))}
          </section>
        </>
      )}

      <h2 className="mx-1 mt-2 text-[22px] font-extrabold tracking-tight">Azi</h2>
      <TodayCard onStarted={() => goTo('workouts')} onChooseRoutine={() => goTo('workouts')} onOpen={() => goTo('workouts')} />

      <HealthCard category="nutrition" icon={Apple} label="Calorii" when="Azi" onOpen={() => goTo('nutrition')}>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <BigValue value={formatNum(kcal7[6], 0)} unit="kcal" />
            <p className="mt-1.5 text-sm text-muted">
              {targets ? kcalLeftText(kcal7[6], targets.kcal) : 'Ținta apare după ce completezi profilul'}
            </p>
          </div>
          {kcal7.some((k) => k > 0) && <MiniBars values={kcal7} category="nutrition" label="Caloriile din ultimele 7 zile" />}
        </div>
      </HealthCard>

      <HealthCard category="water" icon={Droplet} label="Apă" when="Azi">
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <BigValue value={formatNum(water, 0)} unit="ml" />
            <p className="mt-1.5 text-sm text-muted">din {formatNum(waterGoal, 0)}</p>
          </div>
          <button type="button" className="btn-quiet min-h-[44px] px-4" onClick={() => void upsertDay(userId, today, { water_ml: water + 250 })}>
            <Plus size={16} aria-hidden="true" /> 250 ml
          </button>
        </div>
      </HealthCard>

      <HealthCard
        category="body"
        icon={Scale}
        label="Greutate"
        when={latest ? (latest.date === today ? 'Azi' : formatDayMonth(latest.date)) : undefined}
        onOpen={() => goTo('nutrition')}
      >
        {latest ? (
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <BigValue value={formatNum(latest.kg)} unit="kg" />
              <p className="mt-1.5 text-sm text-muted">{change ? change.text : 'Trendul apare după două cântăriri'}</p>
            </div>
            <Sparkline values={month.map((p) => p.trend)} category="body" label="Trendul greutății pe 30 de zile" />
          </div>
        ) : (
          <p className="mt-2 text-[15px] text-subtle">Notează-o în Nutriție, Jurnal.</p>
        )}
      </HealthCard>

      <HealthCard
        category="health"
        icon={Activity}
        label="Mișcare"
        when={data.lastHealth ? daysAgo(data.lastHealth.completed_at, today) : undefined}
        onOpen={() => goTo('health')}
      >
        <div className="mt-2">
          <BigValue value="Pauză de 3 minute" className="text-[24px]" />
          <p className="mt-1.5 text-sm text-muted">Mers, ridicări de pe scaun, mobilitate</p>
        </div>
        <button
          type="button"
          className="btn-quiet mt-3 w-full"
          onClick={() => {
            requestHealthProgram(MOVE_PROGRAM);
            goTo('health');
          }}
        >
          Începe pauza
        </button>
      </HealthCard>

      {(kcalTrend || strength) && <h2 className="mx-1 mt-3 text-[22px] font-extrabold tracking-tight">Tendințe</h2>}
      {kcalTrend && (
        <HealthCard category="nutrition" icon={Apple} label="Calorii" when="4 săpt." onOpen={() => goTo('nutrition')}>
          <p className="mt-1 text-[17px] font-semibold leading-snug">{kcalTrend.text}</p>
          <div className="my-3 h-px bg-line" />
          <DotsChart
            values={kcal28}
            target={targets?.kcal ?? null}
            category="nutrition"
            firstLabel={formatDayMonth(days28[0])}
            label={kcalTrend.text}
          />
        </HealthCard>
      )}
      {strength && (
        <HealthCard category="workouts" icon={Flame} label="Forță" when="8 săpt." onOpen={() => goTo('workouts')}>
          <p className="mt-1 text-[17px] font-semibold leading-snug">{strength.text}</p>
          <div className="my-3 h-px bg-line" />
          <WeekBars
            values={perWeek.slice(0, -1)}
            avg={strength.avg}
            category="workouts"
            firstLabel={formatDayMonth(addDays(today, -7 * 7))}
            label={strength.text}
          />
        </HealthCard>
      )}
    </div>
  );
}
