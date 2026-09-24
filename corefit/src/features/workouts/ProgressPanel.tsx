import { useMemo, useState } from 'react';
import Dexie from 'dexie';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { addDays, formatDayMonth, localDateStr } from '../../lib/date';
import { PLATE } from '../../lib/domains';
import { formatNum } from '../../lib/numbers';
import { epley, findExercise, setScore, setVolume } from '../../lib/workoutStats';
import { LineChart } from '../../components/charts';
import { Panel, Segmented } from '../../components/ui';
import { ActivityHeatmap } from './ActivityHeatmap';
import { MuscleBalance } from './MuscleBalance';

export function ProgressPanel() {
  const { userId } = useApp();
  const catalog = useCatalog(userId);
  const today = useToday();
  const [selected, setSelected] = useState<string>('');
  const [span, setSpan] = useState<'4' | '12' | 'all'>('12');

  const { data: logs } = useLive(
    () =>
      db.workoutLogs
        .where('[user_id+logged_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .filter((l) => !l.deleted && l.set_type === 'work')
        .toArray(),
    [userId],
  );

  const exerciseOptions = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const l of logs ?? []) {
      const c = counts.get(l.exercise_id) ?? { name: l.exercise_name, n: 0 };
      c.n += 1;
      counts.set(l.exercise_id, c);
    }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n).map(([id, v]) => ({ id, name: v.name }));
  }, [logs]);

  const activeId = selected || exerciseOptions[0]?.id || '';
  const exercise = activeId ? findExercise(catalog, activeId, exerciseOptions.find((o) => o.id === activeId)?.name) : null;

  const perDay = useMemo(() => {
    if (!exercise) return [];
    const best = new Map<string, number>();
    for (const l of logs ?? []) {
      if (l.exercise_id !== exercise.id) continue;
      const date = localDateStr(new Date(l.logged_at));
      const score = exercise.kind === 'reps' ? epley(l.weight_kg, l.reps) : l.reps;
      if (score > (best.get(date) ?? 0)) best.set(date, score);
    }
    const from = span === '4' ? addDays(today, -27) : span === '12' ? addDays(today, -83) : null;
    return [...best.entries()]
      .filter(([date]) => !from || date >= from)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, y]) => ({ label: formatDayMonth(date), y }));
  }, [logs, exercise, span, today]);

  const records = useMemo(() => {
    if (!exercise) return null;
    let heaviest = 0;
    let bestScore = 0;
    let bestSet: { weight: number; reps: number } | null = null;
    let volume = 0;
    for (const l of logs ?? []) {
      if (l.exercise_id !== exercise.id) continue;
      heaviest = Math.max(heaviest, l.weight_kg);
      volume += setVolume(exercise.kind, l.weight_kg, l.reps);
      const score = setScore(exercise.kind, l.weight_kg, l.reps);
      if (score > bestScore) {
        bestScore = score;
        bestSet = { weight: l.weight_kg, reps: l.reps };
      }
    }
    return { heaviest, bestSet, volume };
  }, [logs, exercise]);

  if (!logs) return null;
  if (logs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <MuscleBalance />
        <Panel>
          <p className="text-steel/70">Progresul pe exercițiu apare după primele serii notate.</p>
        </Panel>
        <ActivityHeatmap />
      </div>
    );
  }

  const unit = exercise?.kind === 'reps' ? 'kg' : exercise?.kind === 'duration' ? 's' : 'rep';

  return (
    <div className="flex flex-col gap-4">
      <MuscleBalance />
      <Panel title="Progres pe exercițiu">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="progress-exercise" className="label">
              Exercițiu
            </label>
            <select id="progress-exercise" className="field" value={activeId} onChange={(e) => setSelected(e.target.value)}>
              {exerciseOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-sm text-steel/70">
              {exercise?.kind === 'reps' ? '1RM estimat, cea mai bună serie din fiecare zi' : 'Cea mai bună serie din fiecare zi'}
            </p>
            <Segmented<'4' | '12' | 'all'>
              label="Perioadă"
              options={[
                { value: '4', label: '4 săpt.' },
                { value: '12', label: '12 săpt.' },
                { value: 'all', label: 'Tot' },
              ]}
              value={span}
              onChange={setSpan}
              activeClass="bg-plate-red text-white"
            />
            <div className="mt-3">
              <LineChart points={perDay} color={PLATE.red} unit={unit} />
            </div>
          </div>

          {records && (
            <dl className="grid grid-cols-3 gap-3 text-[15px]">
              <div>
                <dt className="text-sm text-steel/60">Cea mai bună serie</dt>
                <dd className="num text-xl">
                  {records.bestSet
                    ? exercise?.kind === 'duration'
                      ? `${records.bestSet.reps} s`
                      : `${records.bestSet.weight > 0 ? formatNum(records.bestSet.weight, 2) : 'corp'} x ${records.bestSet.reps}`
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-steel/60">Cea mai mare greutate</dt>
                <dd className="num text-xl">{records.heaviest > 0 ? `${formatNum(records.heaviest, 2)} kg` : '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-steel/60">Volum total</dt>
                <dd className="num text-xl">{formatNum(records.volume, 0)} kg</dd>
              </div>
            </dl>
          )}
        </div>
      </Panel>

      <ActivityHeatmap />
    </div>
  );
}
