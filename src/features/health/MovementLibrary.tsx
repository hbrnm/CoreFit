import { ChevronRight } from 'lucide-react';
import { PROGRAMS, REGION_LABELS, SPINE_ZONES, programById } from '../../data/health';
import { movementLibrary } from '../../lib/spineOps';
import { Panel } from '../../components/ui';

const LIBRARY = movementLibrary(PROGRAMS, SPINE_ZONES);

function dose(ex: { kind: 'reps' | 'hold'; sets: number; reps?: number; holdS?: number; perSide?: boolean }): string {
  const per = ex.perSide ? ' pe parte' : '';
  return ex.kind === 'hold' ? `${ex.sets} × ${ex.holdS ?? 0} s${per}` : `${ex.sets} × ${ex.reps ?? 0}${per}`;
}

/** Mișcările din programele pentru coloană, pe zone; fiecare duce la programul din care face parte. */
export function MovementLibrary({ onOpen }: { onOpen: (programId: string) => void }) {
  return (
    <>
      {SPINE_ZONES.map((zone) => {
        const moves = LIBRARY.get(zone) ?? [];
        if (moves.length === 0) return null;
        return (
          <Panel key={zone} title={`Mișcări: ${REGION_LABELS[zone]}`}>
            <ul className="divide-y divide-line">
              {moves.map(({ exercise, programIds }) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left"
                    onClick={() => onOpen(programIds[0])}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{exercise.name}</span>
                        <span className="num shrink-0 text-sm font-normal text-subtle">{dose(exercise)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{exercise.how}</span>
                      <span className="mt-0.5 block text-sm text-subtle">
                        Din: {programIds.map((id) => programById(id)?.title ?? id).join(', ')}
                      </span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </>
  );
}
