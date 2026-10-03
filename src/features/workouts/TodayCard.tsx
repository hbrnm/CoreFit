import Dexie from 'dexie';
import { CalendarDays, Play } from 'lucide-react';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { formatDayMonth, formatWeekdayShort } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { FATIGUE_HALF_LIFE_H, muscleFatigue } from '../../lib/fatigue';
import { tiredMusclesFor, todayPlan } from '../../lib/today';
import { startSession } from '../../lib/workoutOps';
import { Notice, Panel } from '../../components/ui';

const D = DOMAIN.workouts;

interface Props {
  /** după pornire (de pe Acasă: du-te la Antrenament) */
  onStarted?: () => void;
}

/** Ce e azi în planul săptămânii, cu pornire directă. Zi liberă: când e următorul antrenament. */
export function TodayCard({ onStarted }: Props) {
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
      .filter((l) => !l.deleted && l.set_type === 'work')
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
      <Panel title="Azi" edge={D.edge}>
        <p className="text-[15px] text-muted">
          Nu ai încă rutine. Alege un șablon din Antrenament, Galerie, apoi pune-l pe zilele săptămânii.
        </p>
      </Panel>
    );
  }

  if (!plan.today) {
    return (
      <Panel title="Azi: zi liberă" edge={D.edge}>
        <p className="flex items-center gap-2 text-[15px] text-fg">
          <CalendarDays size={18} aria-hidden="true" />
          {plan.next
            ? `Următorul antrenament: ${plan.next.routine.name}, ${formatWeekdayShort(plan.next.date)}, ${formatDayMonth(plan.next.date)}.`
            : 'Nicio rutină pusă pe zilele săptămânii. O alegi din Planul săptămânii.'}
        </p>
      </Panel>
    );
  }

  const tired = tiredMusclesFor(plan.today, muscleFatigue(recent, catalog), catalog);
  return (
    <Panel title={`Azi: ${plan.today.name}`} edge={D.edge}>
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-muted">
          {plan.today.exercises.length} exerciții
          {plan.today.is_deload ? ', săptămână de deload' : ''}.
        </p>
        {tired.length > 0 && (
          <Notice tone="warn">
            {tired.length === 1 ? 'Grupă încă obosită' : 'Grupe încă obosite'}: {tired.join(', ')}. Poți merge mai ușor azi
            sau muta antrenamentul din Planul săptămânii.
          </Notice>
        )}
        <button type="button" className={`btn ${D.solid}`} onClick={() => void start()}>
          <Play size={18} aria-hidden="true" />
          Începe {plan.today.name}
        </button>
      </div>
    </Panel>
  );
}
