import { useState } from 'react';
import { MUSCLE_LABELS } from '../../data/exercises';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { DOMAIN, PLATE } from '../../lib/domains';
import { muscleBalance, type MuscleWindow } from '../../lib/muscles';
import { formatNum } from '../../lib/numbers';
import Dexie from 'dexie';
import { Panel, Segmented } from '../../components/ui';

const D = DOMAIN.workouts;

const WINDOWS: ReadonlyArray<{ value: MuscleWindow; label: string }> = [
  { value: '7', label: '7 zile' },
  { value: '30', label: '30 zile' },
  { value: '90', label: '90 zile' },
  { value: 'all', label: 'Tot' },
];

export function MuscleBalance() {
  const { userId } = useApp();
  const catalog = useCatalog(userId);
  const today = useToday();
  const [window, setWindow] = useState<MuscleWindow>('7');
  const [open, setOpen] = useState<string | null>(null);

  const { data: logs } = useLive(
    () =>
      db.workoutLogs
        .where('[user_id+logged_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .filter((l) => !l.deleted && l.set_type === 'work')
        .toArray(),
    [userId],
  );

  if (!logs) return null;
  const rows = muscleBalance(logs, catalog, today, window);
  const quiet = rows.filter((r) => r.sets === 0);
  const max = Math.max(1, ...rows.map((r) => r.sets));

  return (
    <Panel title="Echilibru muscular" edge={D.edge}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-steel/70">
          Seturi de lucru. Grupa principală contează 1, o grupă ajutătoare 0,5. Încălzirea nu intră.
        </p>
        <Segmented<MuscleWindow> label="Perioadă" options={WINDOWS} value={window} onChange={setWindow} activeClass={D.solid} />
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.muscle}>
              <button type="button" className="w-full text-left" onClick={() => setOpen(open === row.muscle ? null : row.muscle)}>
                <span className="mb-1 flex justify-between text-[15px]">
                  <span>{MUSCLE_LABELS[row.muscle]}</span>
                  <span className="tabular-nums">{formatNum(row.sets, 1)}</span>
                </span>
                <span className="block h-2.5 bg-steel/10">
                  <span className="block h-full" style={{ width: `${(row.sets / max) * 100}%`, backgroundColor: PLATE.red }} />
                </span>
              </button>
              {open === row.muscle && (
                <ul className="mt-1 text-sm text-steel/70">
                  {row.exercises.length === 0 && <li>Niciun exercițiu în perioada asta.</li>}
                  {row.exercises.map((ex) => (
                    <li key={ex.id}>
                      {ex.name}: {formatNum(ex.sets, 1)} seturi
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[15px]">
          <span className="font-semibold">Fără activitate: </span>
          {quiet.length === 0 ? 'toate grupele au măcar un set.' : quiet.map((r) => r.label).join(', ')}
        </p>
      </div>
    </Panel>
  );
}
