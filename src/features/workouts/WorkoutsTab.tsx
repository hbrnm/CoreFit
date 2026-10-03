import { useState } from 'react';
import Dexie from 'dexie';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { formatNum } from '../../lib/numbers';
import type { SessionSummary } from '../../lib/workoutOps';
import { Notice, Panel, Segmented, Sheet } from '../../components/ui';
import { ActiveWorkout } from './ActiveWorkout';
import { HistoryPanel } from './HistoryPanel';
import { ProgressPanel } from './ProgressPanel';
import { RoutinesPanel } from './RoutinesPanel';
import { StartPanel } from './StartPanel';

const D = DOMAIN.workouts;

type Sub = 'start' | 'routines' | 'history' | 'progress';

const SUBS: ReadonlyArray<{ value: Sub; label: string }> = [
  { value: 'start', label: 'Start' },
  { value: 'routines', label: 'Galerie' },
  { value: 'history', label: 'Istoric' },
  { value: 'progress', label: 'Progres' },
];

export function WorkoutsTab() {
  const { userId } = useApp();
  const [sub, setSub] = useState<Sub>('start');
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const { data: active } = useLive(
    () =>
      db.workoutSessions
        .where('[user_id+started_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .reverse()
        .filter((s) => !s.deleted && s.kind === 'strength' && s.ended_at === null)
        .first(),
    [userId],
  );

  return (
    <div className="flex flex-col gap-4">
      {active ? (
        <ActiveWorkout key={active.id} session={active} onFinished={setSummary} />
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold leading-tight">Antrenament</h1>
          <Segmented<Sub>
            label="Secțiuni antrenament"
            options={SUBS}
            value={sub}
            onChange={setSub}
            activeClass={D.solid}
            columns={4}
          />
          {sub === 'start' && <StartPanel />}
          {sub === 'routines' && <RoutinesPanel />}
          {sub === 'history' && <HistoryPanel />}
          {sub === 'progress' && <ProgressPanel />}
        </>
      )}

      {summary && (
        <Sheet title="Antrenament încheiat" onClose={() => setSummary(null)}>
          <div className="flex flex-col gap-4">
            <Panel edge={D.edge}>
              <p className="font-display text-2xl font-bold">{summary.name}</p>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-sm text-steel/60">Durată</dt>
                  <dd className="num text-2xl">{summary.minutes} min</dd>
                </div>
                <div>
                  <dt className="text-sm text-steel/60">Serii</dt>
                  <dd className="num text-2xl">{summary.workSets}</dd>
                </div>
                <div>
                  <dt className="text-sm text-steel/60">Volum</dt>
                  <dd className="num text-2xl">{formatNum(summary.volumeKg, 0)} kg</dd>
                </div>
              </dl>
            </Panel>
            {summary.records.length > 0 ? (
              <Notice tone="ok" title="Recorduri noi">
                <ul className="list-inside list-disc">
                  {summary.records.map((r) => (
                    <li key={r.exerciseId}>
                      {r.exerciseName}: {r.weightKg > 0 ? `${formatNum(r.weightKg, 2)} kg x ` : ''}
                      {r.reps}
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : (
              <p className="text-[15px] text-steel/70">
                Fără recorduri noi de data asta. Recordurile se compară cu tot ce ai notat înainte.
              </p>
            )}
            <button type="button" className={`btn ${D.solid}`} onClick={() => setSummary(null)}>
              Gata
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
