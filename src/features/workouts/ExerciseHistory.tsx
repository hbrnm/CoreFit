import { isWorkingSet } from '../../lib/setTypes';
import Dexie from 'dexie';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, type EffortScale } from '../../lib/db';
import { formatDayMonth, localDateStr } from '../../lib/date';
import { tone } from '../../lib/domains';
import { formatEffort } from '../../lib/effort';
import { formatNum } from '../../lib/numbers';
import { epley } from '../../lib/workoutStats';
import type { Exercise } from '../../data/exercises';
import { LineChart } from '../../components/charts';

interface Props {
  exercise: Exercise;
}

/** Ultimele serii de lucru, fără să părăsești antrenamentul. */
export function ExerciseHistory({ exercise }: Props) {
  const { userId } = useApp();
  const { data: logs } = useLive(
    () =>
      db.workoutLogs
        .where('[user_id+logged_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .filter((l) => !l.deleted && isWorkingSet(l.set_type) && l.exercise_id === exercise.id)
        .toArray(),
    [userId, exercise.id],
  );

  if (!logs) return null;
  if (logs.length === 0) return <p className="mt-2 text-sm text-muted">Nicio serie de lucru notată până acum.</p>;

  const byDay = new Map<string, typeof logs>();
  for (const log of logs) {
    const date = localDateStr(new Date(log.logged_at));
    const list = byDay.get(date) ?? [];
    list.push(log);
    byDay.set(date, list);
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);
  const points = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, sets]) => {
      const best = Math.max(
        ...sets.map((s) => (exercise.kind === 'reps' ? (epley(s.weight_kg, s.reps) ?? 0) : s.reps)),
      );
      return { label: formatDayMonth(date), y: best };
    });

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
      <LineChart points={points} color={tone('workouts')} height={110} unit={exercise.kind === 'reps' ? 'kg' : ''} />
      <ul className="flex flex-col gap-1 text-sm text-fg">
        {days.map(([date, sets]) => (
          <li key={date}>
            <span className="font-semibold">{formatDayMonth(date)}: </span>
            {sets
              .map((s) => {
                const load = exercise.kind === 'duration' ? `${s.reps} s` : `${s.weight_kg > 0 ? formatNum(s.weight_kg, 2) : 'corp'} x ${s.reps}`;
                const effort = formatEffort(s.rpe, s.effort_scale as EffortScale | null);
                return effort ? `${load} ${effort}` : load;
              })
              .join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
