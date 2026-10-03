import Dexie from 'dexie';
import type { Muscle } from '../../data/exercises';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { useNow } from '../../hooks/useNow';
import { db } from '../../lib/db';
import { DOMAIN, tone, type Tone } from '../../lib/domains';
import { FATIGUE_HALF_LIFE_H, FATIGUE_LABELS, muscleFatigue, type FatigueLevel } from '../../lib/fatigue';
import { BodyMap, shade } from '../../components/BodyMap';
import { Panel } from '../../components/ui';

const D = DOMAIN.workouts;

const LEVEL_TONE: Record<FatigueLevel, Tone> = {
  fresh: 'success',
  partial: 'warning',
  tired: 'danger',
};

function inHours(h: number): string {
  if (h < 24) return `în ~${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? 'în ~o zi' : `în ~${days} zile`;
}

/** Cât de obosită e fiecare grupă acum, din seturile ultimelor zile. */
export function FatiguePanel() {
  const { userId } = useApp();
  const catalog = useCatalog(userId);
  // se actualizează singur cât timp ecranul e deschis
  const now = useNow(60_000);

  const { data: logs } = useLive(() => {
    const since = new Date(Date.now() - FATIGUE_HALF_LIFE_H * 10 * 3_600_000).toISOString();
    return db.workoutLogs
      .where('[user_id+logged_at]')
      .between([userId, since], [userId, Dexie.maxKey])
      .filter((l) => !l.deleted && l.set_type === 'work')
      .toArray();
  }, [userId]);

  if (!logs) return null;
  const rows = muscleFatigue(logs, catalog, new Date(now));
  const byMuscle = new Map(rows.map((r) => [r.muscle, r]));
  const busy = rows.filter((r) => r.level !== 'fresh').sort((a, b) => b.value - a.value);

  return (
    <Panel title="Oboseală acum" edge={D.edge}>
      <div className="flex flex-col gap-3">
        <BodyMap
          fill={(m: Muscle) => {
            const r = byMuscle.get(m);
            return r && r.level !== 'fresh' ? shade(LEVEL_TONE[r.level], r.value) : shade('success', 0);
          }}
          describe={(m: Muscle) => {
            const r = byMuscle.get(m);
            return r ? `${FATIGUE_LABELS[r.level]}, ${Math.round(r.value * 100)}%` : '';
          }}
        />
        <ul className="flex flex-wrap justify-center gap-3 text-sm text-muted" aria-hidden="true">
          {(['fresh', 'partial', 'tired'] as const).map((level) => (
            <li key={level} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: level === 'fresh' ? shade('success', 0) : tone(LEVEL_TONE[level]) }} />
              {FATIGUE_LABELS[level]}
            </li>
          ))}
        </ul>
        {busy.length === 0 ? (
          <p className="text-[15px]">Toate grupele sunt odihnite.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[15px]">
            {busy.map((r) => (
              <li key={r.muscle} className="flex justify-between gap-2">
                <span>
                  <span className="font-semibold" style={{ color: tone(LEVEL_TONE[r.level]) }}>
                    {r.label}
                  </span>{' '}
                  <span className="text-muted">{FATIGUE_LABELS[r.level].toLowerCase()}</span>
                </span>
                <span className="text-muted">odihnit {inHours(r.hoursToFresh)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">
          Estimare din seturile de lucru: grupa principală contează întreg, cele ajutătoare pe jumătate, iar seturile duse
          aproape de eșec (RIR/RPE notat) contează mai mult. Oboseala scade la jumătate la fiecare {FATIGUE_HALF_LIFE_H} de ore.
          Nu e o măsurătoare: cum te simți contează mai mult.
        </p>
      </div>
    </Panel>
  );
}
