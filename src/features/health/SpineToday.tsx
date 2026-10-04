import { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { REGION_LABELS, SPINE_ZONES } from '../../data/health';
import { SPINE_CHECKLIST } from '../../data/spineChecklist';
import { cx } from '../../lib/cx';
import { addDays, localDateStr } from '../../lib/date';
import { db, newId, nowIso, stamp, type RegionId } from '../../lib/db';
import { plural } from '../../lib/numbers';
import { checklistStreak, toggleChecklistItem } from '../../lib/spineOps';
import { Sheet } from '../../components/ui';
import { PainPicker } from './PainPicker';

/** Bife pe zi de la care ziua intră în serie. */
const STREAK_MIN = 3;

/*
 * Coloana, azi: durerea pe cele trei zone (o atingere ca s-o notezi) și checklistul zilnic.
 * Notările merg în același jurnal de durere ca secțiunea Durere, deci graficele le văd.
 */
export function SpineToday() {
  const { userId } = useApp();
  const today = useToday();
  const [rating, setRating] = useState<RegionId | null>(null);

  const { data: rows } = useLive(
    () =>
      db.spineChecklists
        .where('[user_id+log_date]')
        .between([userId, addDays(today, -60)], [userId, today], true, true)
        .toArray(),
    [userId, today],
  );
  const { data: pain } = useLive(() => {
    const since = new Date(`${today}T00:00:00`).toISOString();
    return db.painLogs
      .where('[user_id+logged_at]')
      .between([userId, since], [userId, '￿'])
      .filter((l) => !l.deleted)
      .toArray();
  }, [userId, today]);

  const done = rows?.find((r) => r.log_date === today)?.done ?? [];
  const streak = checklistStreak(rows ?? [], today, STREAK_MIN);
  const latest = (zone: RegionId) =>
    (pain ?? [])
      .filter((l) => l.region === zone && localDateStr(new Date(l.logged_at)) === today)
      .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      .at(-1)?.score ?? null;

  const savePain = async (zone: RegionId, score: number) => {
    await db.painLogs.put({ id: newId(), user_id: userId, region: zone, score, note: '', logged_at: nowIso(), deleted: false, ...stamp() });
    setRating(null);
  };

  return (
    <section className="panel px-4 pb-2 pt-3" aria-label="Coloana azi">
      <h2 className="text-[20px] font-bold tracking-tight">Spatele azi</h2>
      <p className="text-[15px] text-muted">Durerea acum, de la 0 (deloc) la 10. O atingere pe zonă.</p>
      <ul className="mt-1">
        {SPINE_ZONES.map((zone) => {
          const score = latest(zone);
          const [name, detail] = REGION_LABELS[zone].replace(')', '').split(' (');
          return (
            <li key={zone} className="border-b border-line last:border-b-0">
              <button
                type="button"
                className="flex min-h-[52px] w-full items-center justify-between gap-3 py-2 text-left"
                onClick={() => setRating(zone)}
                aria-label={`${name}: ${score === null ? 'nenotat azi' : `${score} din 10`}. Notează`}
              >
                <span>
                  <span className="block text-[17px]">{name}</span>
                  {detail && <span className="block text-sm text-subtle">{detail}</span>}
                </span>
                <span className={cx('num text-[22px]', score === null ? 'font-normal text-subtle' : score >= 6 ? 'text-warning' : '')}>
                  {score === null ? '–' : score}
                  <span className="text-[15px] font-normal text-subtle"> /10</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-[17px] font-semibold">Checklist zilnic</h3>
        <span className="num text-[15px] font-normal text-subtle">
          {done.length} din {SPINE_CHECKLIST.length}
        </span>
      </div>
      <ul>
        {SPINE_CHECKLIST.map((item) => {
          const on = done.includes(item.id);
          return (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left"
                onClick={() => void toggleChecklistItem(userId, today, item.id)}
              >
                <span
                  className={cx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    on ? 'bg-fg text-canvas' : 'border-[1.5px] border-line-strong',
                  )}
                >
                  {on && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className={cx('block text-[17px]', on && 'text-muted line-through decoration-1')}>{item.title}</span>
                  <span className="block text-sm text-subtle">{item.how}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="py-2 text-sm text-subtle">
        {streak > 0
          ? `Seria: ${plural(streak, 'zi', 'zile')} la rând cu cel puțin ${STREAK_MIN} bife.`
          : `O zi intră în serie de la ${STREAK_MIN} bife.`}{' '}
        Dacă o mișcare doare, sari peste ea.
      </p>

      {rating && (
        <Sheet title={REGION_LABELS[rating]} onClose={() => setRating(null)}>
          <p className="mb-3 text-[15px] text-muted">Cât de tare doare acum? 0 = deloc, 10 = cea mai mare durere imaginabilă.</p>
          <PainPicker label="Nivel de durere" value={latest(rating)} onChange={(n) => void savePain(rating, n)} />
        </Sheet>
      )}
    </section>
  );
}
