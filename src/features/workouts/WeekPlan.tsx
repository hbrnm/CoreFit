import { useState } from 'react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, saveProfilePatch, type LocalRoutine } from '../../lib/db';
import { formatWeekdayShort } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { clearMove, moveRoutineThisWeek, planForWeek, setWeekSlot, type DayPlan } from '../../lib/schedule';
import { Panel, Sheet } from '../../components/ui';

const D = DOMAIN.workouts;

export function WeekPlan() {
  const { userId, profile } = useApp();
  const today = useToday();
  const [open, setOpen] = useState<DayPlan | null>(null);
  const { data: routines } = useLive(
    () =>
      db.routines
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );

  if (!profile) return null;
  const days = planForWeek(profile, today);
  const nameOf = (id: string | null) => routines?.find((r) => r.id === id)?.name ?? (id ? 'Rutină ștearsă' : '');

  const choosePermanent = async (day: DayPlan, routineId: string | null) => {
    await saveProfilePatch(userId, setWeekSlot(profile, day.weekday, routineId));
  };

  const moveTo = async (day: DayPlan, toDate: string, routine: LocalRoutine) => {
    await saveProfilePatch(userId, { week_moves: moveRoutineThisWeek(profile, day.date, toDate, routine.id) });
    setOpen(null);
  };

  return (
    <Panel title="Planul săptămânii">
      <p className="mb-3 text-sm text-muted">Rutina fixă se repetă. O mutare ține doar săptămâna aceasta.</p>
      <ul className="flex flex-col gap-2">
        {days.map((day) => {
          const fixed = nameOf(day.permanentId);
          const moved = nameOf(day.movedId);
          return (
            <li key={day.date}>
              <button type="button" className="btn-quiet w-full justify-between px-3 text-left" onClick={() => setOpen(day)}>
                <span>
                  <span className="block font-semibold capitalize">{formatWeekdayShort(day.date)}</span>
                  <span className="block text-sm font-normal text-muted">
                    {moved ? `${moved}, doar săptămâna aceasta` : fixed || 'Nicio rutină'}
                    {day.movedTo ? `. Mutată pe ${formatWeekdayShort(day.movedTo)}` : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <Sheet title={formatWeekdayShort(open.date)} onClose={() => setOpen(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-muted">Rutina care rămâne în fiecare săptămână, în această zi.</p>
            <button type="button" className="btn-quiet" onClick={() => void choosePermanent(open, null)}>
              Nicio rutină fixă
            </button>
            {(routines ?? []).map((routine) => (
              <button key={routine.id} type="button" className={`btn ${open.permanentId === routine.id ? D.solid : 'btn-quiet'}`} onClick={() => void choosePermanent(open, routine.id)}>
                {routine.name}
              </button>
            ))}
            {(routines ?? []).length === 0 && <p className="text-muted">Creează întâi o rutină.</p>}
            {(open.permanentId || open.movedId) && (
              <div className="border-t border-line pt-3">
                <p className="mb-2 text-[15px]">Mută doar săptămâna aceasta</p>
                {days
                  .filter((d) => d.date !== open.date)
                  .map((d) => {
                    const routine = (routines ?? []).find((r) => r.id === (open.movedId ?? open.permanentId));
                    if (!routine) return null;
                    return (
                      <button key={d.date} type="button" className="btn-quiet mb-2 w-full" onClick={() => void moveTo(open, d.date, routine)}>
                        Pe {formatWeekdayShort(d.date)}
                      </button>
                    );
                  })}
                {open.movedTo && (
                  <button
                    type="button"
                    className="btn-quiet w-full"
                    onClick={() => {
                      void saveProfilePatch(userId, { week_moves: clearMove(profile, open.date) });
                      setOpen(null);
                    }}
                  >
                    Anulează mutarea
                  </button>
                )}
              </div>
            )}
          </div>
        </Sheet>
      )}
    </Panel>
  );
}
