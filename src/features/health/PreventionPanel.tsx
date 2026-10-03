import { PREVENTION_ITEMS } from '../../data/prevention';
import { EVIDENCE_LABELS } from '../../data/health';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db, newId, stamp, type PreventionId } from '../../lib/db';
import { formatDateLong } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { Notice, Panel } from '../../components/ui';

const D = DOMAIN.health;

export function PreventionPanel() {
  const { userId } = useApp();
  const today = useToday();
  const { data: marks } = useLive(
    () =>
      db.preventionMarks
        .where('user_id')
        .equals(userId)
        .filter((m) => !m.deleted)
        .toArray(),
    [userId],
  );

  const byItem = new Map((marks ?? []).map((m) => [m.item_id, m]));

  const toggle = async (itemId: PreventionId) => {
    const existing = byItem.get(itemId);
    if (existing) {
      await db.preventionMarks.update(existing.id, { deleted: true, ...stamp() });
      return;
    }
    await db.preventionMarks.put({
      id: newId(),
      user_id: userId,
      item_id: itemId,
      marked_on: today,
      note: '',
      deleted: false,
      ...stamp(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info" title="Nu este un diagnostic">
        Lista te ajută să ții minte ce ai discutat sau verificat. Nu îți spune ce boală ai și nu înlocuiește medicul.
      </Notice>
      {PREVENTION_ITEMS.map((item) => {
        const mark = byItem.get(item.id);
        return (
          <Panel key={item.id} title={item.title} edge={D.edge}>
            <p className="text-[15px] leading-snug">{item.body}</p>
            <p className="mt-2 text-sm text-muted">
              {EVIDENCE_LABELS[item.evidence]}.{' '}
              <a className="underline" href={item.sourceUrl} target="_blank" rel="noreferrer">
                {item.sourceLabel}
              </a>
            </p>
            <button type="button" className={`btn mt-3 w-full ${mark ? 'btn-quiet' : D.solid}`} onClick={() => void toggle(item.id)}>
              {mark ? `Marcat pe ${formatDateLong(`${mark.marked_on}T12:00:00`)}. Anulează` : 'Am discutat sau am verificat'}
            </button>
          </Panel>
        );
      })}
    </div>
  );
}
