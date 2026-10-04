import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { REGION_LABELS } from '../../data/health';
import { cx } from '../../lib/cx';
import { db, type RegionId } from '../../lib/db';
import { axialWarning, PAIN_WINDOW_H } from '../../lib/spineOps';
import { findExercise } from '../../lib/workoutStats';

/** „durere lombară”: adjectivul zonei, pentru propoziții. */
export const PAIN_ADJ: Partial<Record<RegionId, string>> = { neck: 'cervicală', thoracic: 'toracală', lower_back: 'lombară' };

/** Notările de durere din ultimele PAIN_WINDOW_H ore (cât contează pentru avertisment). */
export function useRecentPain() {
  const { userId } = useApp();
  return useLive(() => {
    const since = new Date(Date.now() - PAIN_WINDOW_H * 3_600_000).toISOString();
    return db.painLogs
      .where('[user_id+logged_at]')
      .between([userId, since], [userId, '￿'])
      .filter((l) => !l.deleted)
      .toArray();
  }, [userId]).data;
}

/**
 * „Genuflexiunile încarcă coloana, iar durerea lombară e 7 din 10.” Apare doar când un
 * exercițiu axial greu coincide cu o durere mare recentă; altfel nu ocupă loc.
 */
export function AxialWarning({ exerciseIds, compact = false, className }: { exerciseIds: readonly string[]; compact?: boolean; className?: string }) {
  const { userId, goTo } = useApp();
  const catalog = useCatalog(userId);
  const pain = useRecentPain();
  const w = pain ? axialWarning(exerciseIds, pain) : null;
  if (!w) return null;
  const names = w.exerciseIds.map((id) => findExercise(catalog, id).name);
  const zone = PAIN_ADJ[w.zone] ?? REGION_LABELS[w.zone].toLowerCase();
  return (
    <div role="alert" className={cx('flex gap-3 rounded-2xl bg-warning/15 p-3.5 text-[15px] leading-snug', className)}>
      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          Durere {zone} {w.score} din 10 și {names.length === 1 ? 'un exercițiu' : 'exerciții'} care încarcă coloana
        </p>
        {!compact && (
          <p className="mt-1 text-muted">
            {names.join(', ')}. Poți scădea greutatea, alege o variantă sprijinită sau sări peste azi. Dacă durerea crește în
            timpul seriei, oprește-te.
          </p>
        )}
        {!compact && (
          <button type="button" className="mt-1 min-h-[44px] font-semibold text-brand-fg" onClick={() => goTo('health')}>
            Vezi programele pentru spate
          </button>
        )}
      </div>
    </div>
  );
}
