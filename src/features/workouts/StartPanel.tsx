import Dexie from 'dexie';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { formatDayMonth, formatWeekdayShort } from '../../lib/date';
import { tone } from '../../lib/domains';
import { FATIGUE_HALF_LIFE_H, muscleFatigue } from '../../lib/fatigue';
import { previewRows } from '../../lib/sessionEdit';
import { isWorkingSet } from '../../lib/setTypes';
import { tiredMusclesFor, todayPlan } from '../../lib/today';
import { buildDraftExercise, resolveProgression, startSession } from '../../lib/workoutOps';
import { findExercise } from '../../lib/workoutStats';
import { WeeklyGoals } from '../../components/WeeklyGoals';
import { PlateCalculator } from './PlateCalculator';
import { estimateMinutes } from './TodayCard';
import { WeekPlan } from './WeekPlan';

/** Id-ul cu care se calculează previzualizarea: nicio sesiune reală nu-l are. */
const PREVIEW_SESSION = 'preview';

/*
 * Start, în stilul C (fără carduri): ce e azi, cu exercițiile și greutățile cu care pornești,
 * apoi planul săptămânii. Greutățile sunt exact cele care se precompletează la pornire.
 */
export function StartPanel() {
  const { userId, profile } = useApp();
  const today = useToday();
  const catalog = useCatalog(userId);

  const { data: routines } = useLive(
    () =>
      db.routines
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );
  const plan = profile && routines ? todayPlan(profile, today, routines) : null;
  const routine = plan?.today ?? null;

  const { data: drafts } = useLive(
    () =>
      routine
        ? Promise.all(routine.exercises.map((spec) => buildDraftExercise(userId, spec, PREVIEW_SESSION, resolveProgression(routine, spec))))
        : [],
    [userId, routine?.id, routine?.client_updated_at],
  );
  const { data: recent } = useLive(() => {
    const since = new Date(Date.now() - FATIGUE_HALF_LIFE_H * 10 * 3_600_000).toISOString();
    return db.workoutLogs
      .where('[user_id+logged_at]')
      .between([userId, since], [userId, Dexie.maxKey])
      .filter((l) => !l.deleted && isWorkingSet(l.set_type))
      .toArray();
  }, [userId]);

  if (!profile || !routines || !plan) return null;

  const start = async (name: string, from: typeof routine) => {
    try {
      await startSession(userId, name, from);
    } catch {
      window.alert('Nu s-a putut porni antrenamentul.');
    }
  };

  const tired = routine && recent ? tiredMusclesFor(routine, muscleFatigue(recent, catalog), catalog) : [];
  const rows = drafts ? previewRows(drafts, (id) => findExercise(catalog, id).name) : [];

  return (
    <div className="flex flex-col gap-4">
      <section>
        <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">
          <span className="h-2 w-2 rounded-full" style={{ background: tone('subtle') }} aria-hidden="true" />
          Azi
        </p>
        {routine ? (
          <>
            <h2 className="mt-1 text-[34px] font-extrabold leading-tight tracking-tight">{routine.name}</h2>
            <p className="mt-0.5 text-[17px] text-muted">
              cam {estimateMinutes(routine)} min
              {routine.is_deload ? ' · săptămână de deload' : ''}
              {tired.length > 0 ? ` · Încă ${tired.length === 1 ? 'obosită' : 'obosite'}: ${tired.join(', ')}` : ''}
            </p>
            {rows.length > 0 && (
              <ul className="mt-2">
                {rows.map((r) => (
                  <li key={r.title} className="flex min-h-[48px] items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                    <span className="text-[17px]">{r.title}</span>
                    <span className="num shrink-0 text-[15px] font-normal text-subtle">{r.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h2 className="mt-1 text-[34px] font-extrabold leading-tight tracking-tight">
              {routines.length === 0 ? 'Nicio rutină încă' : 'Zi liberă'}
            </h2>
            <p className="mt-0.5 text-[17px] text-muted">
              {routines.length === 0
                ? 'Alege un șablon din Galerie sau fă-ți una.'
                : plan.next
                  ? `Următorul: ${plan.next.routine.name}, ${formatWeekdayShort(plan.next.date)}, ${formatDayMonth(plan.next.date)}.`
                  : 'Nicio rutină pusă pe zilele săptămânii. O alegi mai jos, din Planul săptămânii.'}
            </p>
          </>
        )}
      </section>

      <div className="flex flex-col gap-2.5">
        {routine && (
          <button type="button" className="btn-primary min-h-[56px] w-full justify-between px-5 text-[17px]" onClick={() => void start(routine.name, routine)}>
            Începe antrenamentul
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="btn min-h-[56px] w-full border border-line-strong/40 text-[17px] text-fg active:bg-fg/5"
          onClick={() => void start('Antrenament liber', null)}
        >
          Antrenament liber
        </button>
        {!routine && <p className="text-center text-sm text-muted">Îți alegi exercițiile pe parcurs.</p>}
      </div>

      <WeekPlan />
      <WeeklyGoals color={tone('workouts')} />
      <PlateCalculator />
    </div>
  );
}
