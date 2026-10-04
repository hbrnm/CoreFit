import { useMemo, useState } from 'react';
import Dexie from 'dexie';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { isWorkingSet } from '../../lib/setTypes';
import { formatDayMonth, startOfWeek } from '../../lib/date';
import { muscleFatigue } from '../../lib/fatigue';
import { formatNum } from '../../lib/numbers';
import { bestSeries, bucketFor, changeSentence, FATIGUE_SHORT, fatigueByGroup, rangeFrom, RANGES, type Range } from '../../lib/progress';
import { weekStartOf } from '../../lib/schedule';
import { bestEstimated1RM, findExercise, setScore, setVolume } from '../../lib/workoutStats';
import { ProgressChart } from '../../components/ProgressChart';
import { Panel, RangePicker } from '../../components/ui';
import { ActivityHeatmap } from './ActivityHeatmap';
import { FatiguePanel } from './FatiguePanel';
import { MuscleBalance } from './MuscleBalance';
import { OneRmCalculator } from './OneRmCalculator';

/*
 * Progres, după design/round5/06: 1RM estimat cu propoziția de ritm și graficul pe interval,
 * apoi oboseala pe grupe mari. Detaliile (harta oboselii, echilibrul, recordurile) urmează dedesubt.
 */
export function ProgressPanel() {
  const { userId, profile } = useApp();
  const catalog = useCatalog(userId);
  const today = useToday();
  const [selected, setSelected] = useState<string>('');
  const [range, setRange] = useState<Range>('90z');

  const { data: logs } = useLive(
    () =>
      db.workoutLogs
        .where('[user_id+logged_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .filter((l) => !l.deleted && isWorkingSet(l.set_type))
        .toArray(),
    [userId],
  );

  const exerciseOptions = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const l of logs ?? []) {
      const c = counts.get(l.exercise_id) ?? { name: findExercise(catalog, l.exercise_id, l.exercise_name).name, n: 0 };
      c.n += 1;
      counts.set(l.exercise_id, c);
    }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n).map(([id, v]) => ({ id, name: v.name }));
  }, [logs, catalog]);

  const activeId = selected || exerciseOptions[0]?.id || '';
  const exercise = activeId ? findExercise(catalog, activeId, exerciseOptions.find((o) => o.id === activeId)?.name) : null;
  const from = rangeFrom(today, range);
  const bucket = bucketFor(range);
  const weekStart = weekStartOf(profile);

  const series = useMemo(
    () => (exercise ? bestSeries(logs ?? [], exercise.id, exercise.kind, from, today, bucket, weekStart) : []),
    [logs, exercise, from, today, bucket, weekStart],
  );
  const groups = useMemo(() => fatigueByGroup(muscleFatigue(logs ?? [], catalog)), [logs, catalog]);

  const records = useMemo(() => {
    if (!exercise) return null;
    let heaviest = 0;
    let bestScore = 0;
    let bestSet: { weight: number; reps: number } | null = null;
    let volume = 0;
    const mine = (logs ?? []).filter((l) => l.exercise_id === exercise.id);
    const oneRm = exercise.kind === 'reps' ? bestEstimated1RM(mine) : null;
    for (const l of mine) {
      heaviest = Math.max(heaviest, l.weight_kg);
      volume += setVolume(exercise.kind, l.weight_kg, l.reps);
      const score = setScore(exercise.kind, l.weight_kg, l.reps);
      if (score > bestScore) {
        bestScore = score;
        bestSet = { weight: l.weight_kg, reps: l.reps };
      }
    }
    return { heaviest, bestSet, volume, oneRm };
  }, [logs, exercise]);

  if (!logs) return null;

  const unit = exercise?.kind === 'reps' ? 'kg' : exercise?.kind === 'duration' ? 's' : 'rep.';
  const last = series[series.length - 1];
  const sentence = changeSentence(series, unit);
  const lastWhen = !last
    ? ''
    : bucket === 'week'
      ? last.date === startOfWeek(today, weekStart)
        ? 'săpt. asta'
        : `săpt. ${formatDayMonth(last.date)}`
      : last.date === today
        ? 'azi'
        : formatDayMonth(last.date);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={exercise?.kind === 'reps' ? '1RM estimat' : 'Cea mai bună serie'}>
        <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-workouts">
          {exercise?.kind === 'reps' || !exercise ? '1RM estimat' : 'Cea mai bună serie'}
        </h2>
        {logs.length === 0 ? (
          <p className="mt-2 text-[17px] text-muted">Progresul pe exercițiu apare după primele serii notate.</p>
        ) : (
          <>
            <select
              aria-label="Exercițiu"
              className="field mt-3 text-[17px] font-semibold"
              value={activeId}
              onChange={(e) => setSelected(e.target.value)}
            >
              {exerciseOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <RangePicker<Range> label="Interval" options={RANGES} value={range} onChange={setRange} />
            </div>
            {last ? (
              <>
                <p className="num mt-4 text-[64px] leading-none tracking-tight">
                  {formatNum(last.value)}
                  <span className="ml-1 text-[22px] font-semibold tracking-normal text-subtle">{unit}</span>
                </p>
                {sentence && <p className="mt-2 text-[17px] leading-snug text-muted">{sentence}</p>}
                <div className="mt-4">
                  <ProgressChart
                    from={from}
                    to={today}
                    line={series}
                    category="workouts"
                    unit={unit}
                    lastLabel={`${lastWhen} · ${formatNum(last.value)} ${unit}`}
                    label={sentence ?? `${exercise?.name}: ${formatNum(last.value)} ${unit}`}
                  />
                </div>
              </>
            ) : (
              <p className="mt-3 text-[17px] text-muted">Nicio serie de 1–12 repetări în acest interval. Alege unul mai lung.</p>
            )}
          </>
        )}
      </section>

      <section className="border-t border-line pt-4" aria-label="Oboseala pe grupe">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">Oboseala pe grupe</h2>
          <span className="text-[15px] text-subtle">acum</span>
        </div>
        <ul className="mt-1">
          {groups.map((g) => (
            <li key={g.label} className="flex min-h-[48px] items-center gap-3 border-b border-line last:border-b-0">
              <span className="flex-1 text-[17px] font-semibold">{g.label}</span>
              <span className="w-20 text-right text-[15px] text-muted">{FATIGUE_SHORT[g.level]}</span>
              <span className="h-1.5 w-28 rounded-full bg-fg/10" aria-hidden="true">
                <span className="block h-full rounded-full bg-fg" style={{ width: `${Math.max(4, g.value * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {records && exercise && (
        <Panel title={`Recorduri: ${exercise.name}`}>
          <dl className="grid grid-cols-3 gap-3 text-[15px]">
            <div>
              <dt className="text-sm text-muted">Cea mai bună serie</dt>
              <dd className="num text-xl">
                {records.bestSet
                  ? exercise.kind === 'duration'
                    ? `${records.bestSet.reps} s`
                    : `${records.bestSet.weight > 0 ? formatNum(records.bestSet.weight, 2) : 'corp'} × ${records.bestSet.reps}`
                  : '–'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Cea mai mare greutate</dt>
              <dd className="num text-xl">{records.heaviest > 0 ? `${formatNum(records.heaviest, 2)} kg` : '–'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Volum total</dt>
              <dd className="num text-xl">{formatNum(records.volume, 0)} kg</dd>
            </div>
          </dl>
          {records.oneRm && (
            <p className="mt-3 text-[15px] text-muted">
              1RM estimat maxim: {formatNum(records.oneRm.value, 1)} kg, din seria de {formatNum(records.oneRm.weightKg, 2)} kg ×{' '}
              {records.oneRm.reps}.
            </p>
          )}
        </Panel>
      )}

      <FatiguePanel />
      <MuscleBalance />
      <OneRmCalculator />
      <ActivityHeatmap />
    </div>
  );
}
