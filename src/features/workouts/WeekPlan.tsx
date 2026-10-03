import { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, saveProfilePatch, type LocalRoutine } from '../../lib/db';
import { addDays, formatWeekdayShort, localDateStr } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { clearMove, moveRoutineThisWeek, planForWeek, setWeekSlot, type DayPlan } from '../../lib/schedule';
import { Sheet } from '../../components/ui';
import { cx } from '../../lib/cx';

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

  const days = profile ? planForWeek(profile, today) : [];
  const first = days[0]?.date ?? today;
  const { data: sessions } = useLive(
    () =>
      db.workoutSessions
        .where('[user_id+started_at]')
        .between([userId, addDays(first, -1)], [userId, '\uffff'])
        .filter((x) => !x.deleted && x.ended_at !== null)
        .toArray(),
    [userId, first],
  );

  if (!profile) return null;
  const nameOf = (id: string | null) => routines?.find((r) => r.id === id)?.name ?? (id ? 'Rutină ștearsă' : '');

  const choosePermanent = async (day: DayPlan, routineId: string | null) => {
    await saveProfilePatch(userId, setWeekSlot(profile, day.weekday, routineId));
  };

  const moveTo = async (day: DayPlan, toDate: string, routine: LocalRoutine) => {
    await saveProfilePatch(userId, { week_moves: moveRoutineThisWeek(profile, day.date, toDate, routine.id) });
    setOpen(null);
  };

  const doneDays = new Set((sessions ?? []).map((x) => localDateStr(new Date(x.started_at))));

  return (
    <section className="border-t border-line pt-4">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">Planul săptămânii</h2>
      <ul className="mt-1">
        {days.map((day) => {
          const fixed = nameOf(day.permanentId);
          const moved = nameOf(day.movedId);
          const done = day.date <= today && doneDays.has(day.date);
          const name = moved || fixed;
          return (
            <li key={day.date} className="border-b border-line last:border-b-0">
              <button
                type="button"
                className="flex min-h-[52px] w-full items-center gap-4 py-2 text-left"
                onClick={() => setOpen(day)}
                aria-label={`${formatWeekdayShort(day.date)}: ${name || 'odihnă'}${done ? ', făcut' : ''}. Schimbă`}
              >
                <span className={cx('w-10 shrink-0 capitalize text-subtle', day.date === today && 'font-bold text-fg')}>
                  {formatWeekdayShort(day.date).replace('.', '')}
                </span>
                <span className="flex-1">
                  <span className={cx('block text-[17px]', name ? 'font-semibold' : 'text-subtle')}>{name || 'Odihnă'}</span>
                  {(moved || day.movedTo) && (
                    <span className="block text-sm text-muted">
                      {moved ? 'doar săptămâna aceasta' : ''}
                      {day.movedTo ? `mutată pe ${formatWeekdayShort(day.movedTo)}` : ''}
                    </span>
                  )}
                </span>
                {done && <Check size={18} className="text-subtle" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-subtle">Apasă pe o zi ca s-o schimbi. Rutina fixă se repetă; o mutare ține doar săptămâna aceasta.</p>

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
    </section>
  );
}
