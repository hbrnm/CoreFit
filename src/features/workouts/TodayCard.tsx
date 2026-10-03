import Dexie from 'dexie';
import { AlertTriangle, Dumbbell } from 'lucide-react';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { isWorkingSet } from '../../lib/setTypes';
import { formatDayMonth, formatWeekdayShort } from '../../lib/date';
import { FATIGUE_HALF_LIFE_H, muscleFatigue } from '../../lib/fatigue';
import { tiredMusclesFor, todayPlan } from '../../lib/today';
import { startSession } from '../../lib/workoutOps';
import type { LocalRoutine } from '../../lib/db';
import { BigValue, HealthCard } from '../../components/HealthCard';

interface Props {
  /** după pornire (de pe Acasă: du-te la Antrenament) */
  onStarted?: () => void;
  /** fără rutine: unde alegi una (de pe Acasă: Antrenament, Galerie) */
  onChooseRoutine?: () => void;
  /** apăsarea pe antetul cardului */
  onOpen?: () => void;
}

/** Durata estimată: fiecare serie cam 40 s de lucru plus pauza ei, rotunjit la 5 minute. */
export function estimateMinutes(routine: Pick<LocalRoutine, 'exercises'>): number {
  const seconds = routine.exercises.reduce((sum, e) => sum + e.sets * (40 + e.rest_s), 0);
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** Ce e azi în planul săptămânii, cu pornire directă. Zi liberă: când e următorul antrenament. */
export function TodayCard({ onStarted, onChooseRoutine, onOpen }: Props) {
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
  const { data: recent } = useLive(() => {
    const since = new Date(Date.now() - FATIGUE_HALF_LIFE_H * 10 * 3_600_000).toISOString();
    return db.workoutLogs
      .where('[user_id+logged_at]')
      .between([userId, since], [userId, Dexie.maxKey])
      .filter((l) => !l.deleted && isWorkingSet(l.set_type))
      .toArray();
  }, [userId]);

  if (!profile || !routines || !recent) return null;

  const plan = todayPlan(profile, today, routines);
  const start = async () => {
    if (!plan.today) return;
    try {
      await startSession(userId, plan.today.name, plan.today);
      onStarted?.();
    } catch {
      window.alert('Nu s-a putut porni antrenamentul.');
    }
  };

  if (routines.length === 0) {
    return (
      <HealthCard category="workouts" icon={Dumbbell} label="Antrenament" when="Azi" onOpen={onOpen}>
        <p className="mt-2 text-[15px] text-subtle">Nicio rutină încă. Alege un șablon gata făcut sau fă-ți una.</p>
        {onChooseRoutine && (
          <button type="button" className="btn-primary mt-3 w-full" onClick={onChooseRoutine}>
            Alege o rutină
          </button>
        )}
      </HealthCard>
    );
  }

  if (!plan.today) {
    return (
      <HealthCard category="workouts" icon={Dumbbell} label="Antrenament" when="Azi" onOpen={onOpen}>
        <div className="mt-2">
          <BigValue value="Zi liberă" className="text-[28px]" />
          <p className="mt-1.5 text-[15px] text-muted">
            {plan.next
              ? `Următorul: ${plan.next.routine.name}, ${formatWeekdayShort(plan.next.date)}, ${formatDayMonth(plan.next.date)}.`
              : 'Nicio rutină pusă pe zilele săptămânii. O alegi din Planul săptămânii.'}
          </p>
        </div>
      </HealthCard>
    );
  }

  const tired = tiredMusclesFor(plan.today, muscleFatigue(recent, catalog), catalog);
  const n = plan.today.exercises.length;
  return (
    <HealthCard category="workouts" icon={Dumbbell} label="Antrenament" when="Azi" onOpen={onOpen}>
      <div className="mt-2">
        <BigValue value={plan.today.name} className="text-[28px]" />
        <p className="mt-1.5 text-[15px] text-muted">
          {n} {n === 1 ? 'exercițiu' : 'exerciții'} · cam {estimateMinutes(plan.today)} min
          {plan.today.is_deload ? ' · săptămână de deload' : ''}
        </p>
        {tired.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted">
            <AlertTriangle size={16} aria-hidden="true" />
            Încă {tired.length === 1 ? 'obosită' : 'obosite'}: {tired.join(', ').toLowerCase()}
          </p>
        )}
      </div>
      <button type="button" className="btn-primary mt-3 w-full" onClick={() => void start()}>
        Începe antrenamentul
      </button>
    </HealthCard>
  );
}
