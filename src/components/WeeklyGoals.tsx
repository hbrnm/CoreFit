import { useApp } from '../context';
import { useLive } from '../hooks/useLive';
import { useToday } from '../hooks/useToday';
import { db } from '../lib/db';
import { calendarWeekActivity } from '../lib/workoutStats';
import { weekStartOf } from '../lib/schedule';
import { Panel } from './ui';

const AEROBIC_MIN = 150;
const STRENGTH_DAYS = 2;

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="h-2.5 w-full bg-steel/10" role="presentation">
      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** Progresul săptămânii calendaristice față de recomandările OMS 2020. */
export function WeeklyGoals({ color }: { color: string }) {
  const { userId, profile } = useApp();
  const today = useToday();
  const starts = weekStartOf(profile);
  const { data: sessions } = useLive(
    () =>
      db.workoutSessions
        .where('[user_id+started_at]')
        .between([userId, ''], [userId, '\uffff'])
        .filter((s) => !s.deleted)
        .toArray(),
    [userId],
  );

  const week = calendarWeekActivity(sessions ?? [], today, starts);

  return (
    <Panel title="Săptămâna aceasta">
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1 flex justify-between text-[15px]">
            <span>Efort aerob (minute echivalent moderat)</span>
            <span className="tabular-nums">
              {week.aerobicEquivalentMin} din {AEROBIC_MIN}
            </span>
          </div>
          <Bar value={week.aerobicEquivalentMin} target={AEROBIC_MIN} color={color} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[15px]">
            <span>Zile cu antrenament de forță</span>
            <span className="tabular-nums">
              {week.strengthDays} din {STRENGTH_DAYS}
            </span>
          </div>
          <Bar value={week.strengthDays} target={STRENGTH_DAYS} color={color} />
        </div>
        <p className="text-sm text-steel/60">
          Săptămâna începe {starts === 'sunday' ? 'duminică' : 'luni'}. O schimbi din Profil. Recomandarea OMS 2020:
          150-300 de minute de efort moderat (intensul se numără dublu) și forță în cel puțin 2 zile. Orice cantitate
          e mai bună decât deloc.
        </p>
      </div>
    </Panel>
  );
}
