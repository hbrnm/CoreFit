import { isWorkingSet, SET_TYPE_LABELS } from '../../lib/setTypes';
import { useMemo, useState } from 'react';
import Dexie from 'dexie';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { db, type LocalWorkoutLog } from '../../lib/db';
import { formatDateLong } from '../../lib/date';
import { formatNum } from '../../lib/numbers';
import { deleteSession } from '../../lib/workoutOps';
import { findExercise, sessionMinutes, setVolume } from '../../lib/workoutStats';
import { Panel, SyncMark } from '../../components/ui';
import { BackfillForm } from './BackfillForm';

export function HistoryPanel() {
  const { userId } = useApp();
  const catalog = useCatalog(userId);
  const [open, setOpen] = useState<string | null>(null);

  const { data } = useLive(async () => {
    const sessions = await db.workoutSessions
      .where('[user_id+started_at]')
      .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
      .reverse()
      .filter((s) => !s.deleted && s.ended_at !== null)
      .limit(60)
      .toArray();
    const logs = await db.workoutLogs
      .where('[user_id+logged_at]')
      .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
      .filter((l) => !l.deleted && l.session_id !== null)
      .toArray();
    return { sessions, logs };
  }, [userId]);

  const bySession = useMemo(() => {
    const map = new Map<string, LocalWorkoutLog[]>();
    for (const l of data?.logs ?? []) {
      if (!l.session_id) continue;
      const list = map.get(l.session_id) ?? [];
      list.push(l);
      map.set(l.session_id, list);
    }
    return map;
  }, [data]);

  if (!data) return null;
  if (data.sessions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <BackfillForm sessions={data.sessions} />
        <Panel>
          <p className="text-muted">Nu ai încă antrenamente încheiate. Cele terminate apar aici.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BackfillForm sessions={data.sessions} />
      <ul className="flex flex-col border-t border-line">
        {data.sessions.map((s) => {
          const sets = (bySession.get(s.id) ?? []).sort((a, b) => a.logged_at.localeCompare(b.logged_at));
          const work = sets.filter((l) => isWorkingSet(l.set_type));
          const volume = work.reduce(
            (sum, l) => sum + setVolume(findExercise(catalog, l.exercise_id, l.exercise_name).kind, l.weight_kg, l.reps),
            0,
          );
          const minutes = sessionMinutes(s);
  
          const byExercise = new Map<string, LocalWorkoutLog[]>();
          for (const l of sets) byExercise.set(l.exercise_id, [...(byExercise.get(l.exercise_id) ?? []), l]);
  
          const isOpen = open === s.id;
          return (
            <li key={s.id} className="border-b border-line">
              <button
                type="button"
                className="flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : s.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-sm capitalize text-muted">{formatDateLong(s.started_at)}</p>
                  <p className="text-[15px] text-fg">
                    {s.kind === 'cardio'
                      ? `${minutes} min, ${s.intensity === 'vigorous' ? 'intens' : 'moderat'}`
                      : `${minutes} min, ${work.length} serii, ${formatNum(volume, 0)} kg volum`}
                  </p>
                </div>
                <SyncMark status={s.sync_status} />
              </button>
  
              {isOpen && (
                <div className="border-t border-line p-3">
                  {s.kind === 'strength' && (
                    <ul className="flex flex-col gap-2 text-[15px]">
                      {[...byExercise.entries()].map(([id, list]) => {
                        const ex = findExercise(catalog, id, list[0].exercise_name);
                        return (
                          <li key={id}>
                            <span className="font-semibold">{ex.name}: </span>
                            {list
                              .map((l) => {
                                const core =
                                  ex.kind === 'duration'
                                    ? `${l.reps} s`
                                    : `${l.weight_kg > 0 ? formatNum(l.weight_kg, 2) : 'corp'} x ${l.reps}`;
                                return l.set_type === 'work' ? core : `${core} (${SET_TYPE_LABELS[l.set_type].toLowerCase()})`;
                              })
                              .join(', ')}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {s.notes && <p className="mt-2 text-[15px] text-muted">{s.notes}</p>}
                  <button
                    type="button"
                    className="btn-danger mt-3 "
                    onClick={() => {
                      if (window.confirm('Ștergi acest antrenament?')) void deleteSession(s.id);
                    }}
                  >
                    <Trash2 size={18} />
                    Șterge antrenamentul
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
