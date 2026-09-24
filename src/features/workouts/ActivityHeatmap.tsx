import { useMemo, useState } from 'react';
import Dexie from 'dexie';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { addDays, formatDateLong, localDateStr, startOfWeek } from '../../lib/date';
import { PLATE } from '../../lib/domains';
import { weekStartOf } from '../../lib/schedule';
import { sessionMinutes } from '../../lib/workoutStats';
import { Panel } from '../../components/ui';

export function ActivityHeatmap() {
  const { userId, profile } = useApp();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const starts = weekStartOf(profile);

  const { data: sessions } = useLive(
    () =>
      db.workoutSessions
        .where('[user_id+started_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .filter((s) => !s.deleted && s.ended_at !== null)
        .toArray(),
    [userId],
  );

  const year = today.slice(0, 4);
  const grid = useMemo(() => {
    const byDate = new Map<string, { minutes: number; names: string[] }>();
    for (const s of sessions ?? []) {
      const date = localDateStr(new Date(s.started_at));
      if (!date.startsWith(year)) continue;
      const bucket = byDate.get(date) ?? { minutes: 0, names: [] };
      bucket.minutes += Math.max(1, sessionMinutes(s));
      bucket.names.push(s.name);
      byDate.set(date, bucket);
    }
    const first = startOfWeek(`${year}-01-01`, starts);
    const columns: string[][] = [];
    for (let date = first; date <= `${year}-12-31`; date = addDays(date, 7)) {
      columns.push(Array.from({ length: 7 }, (_, i) => addDays(date, i)));
    }
    return { byDate, columns };
  }, [sessions, year, starts]);

  if (!sessions) return null;
  const max = Math.max(1, ...[...grid.byDate.values()].map((d) => d.minutes));
  const chosen = picked ? grid.byDate.get(picked) : undefined;

  return (
    <Panel title={`Activitate în ${year}`}>
      <p className="mb-3 text-sm text-steel/60">Culoarea arată minutele de antrenament încheiat, nu un scor.</p>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1" style={{ width: 'max-content' }}>
          {grid.columns.map((col) => (
            <div key={col[0]} className="flex flex-col gap-1">
              {col.map((date) => {
                const inYear = date.startsWith(year) && date <= today;
                const minutes = grid.byDate.get(date)?.minutes ?? 0;
                const tone = !inYear ? 'transparent' : minutes === 0 ? 'rgba(29,39,51,0.08)' : PLATE.red;
                const opacity = minutes === 0 ? 1 : 0.35 + 0.65 * (minutes / max);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!inYear}
                    aria-label={inYear ? `${date}, ${minutes} minute` : undefined}
                    onClick={() => setPicked(date)}
                    className="h-3.5 w-3.5"
                    style={{ backgroundColor: tone, opacity: inYear ? opacity : 0 }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {picked && (
        <div className="mt-3 text-[15px]">
          <p className="font-semibold">{formatDateLong(`${picked}T12:00:00`)}</p>
          {chosen ? (
            <ul>
              {chosen.names.map((name, i) => (
                <li key={`${name}-${i}`}>{name}</li>
              ))}
              <li className="text-steel/60">{chosen.minutes} minute</li>
            </ul>
          ) : (
            <p className="text-steel/70">Nicio sesiune încheiată.</p>
          )}
        </div>
      )}
    </Panel>
  );
}
