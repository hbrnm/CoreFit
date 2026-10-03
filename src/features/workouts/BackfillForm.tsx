import { useState } from 'react';
import { History } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, type LocalWorkoutSession } from '../../lib/db';
import { localDateStr } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { backfillWindow, BACKFILL_MAX_MINUTES } from '../../lib/sessionEdit';
import { startSession } from '../../lib/workoutOps';
import { Notice, Panel } from '../../components/ui';

const D = DOMAIN.workouts;

interface Props {
  /** antrenamentele încheiate deja, ca să avertizăm când ziua aleasă are unul */
  sessions: readonly LocalWorkoutSession[];
}

/**
 * Un antrenament uitat de notat: alegi ziua, ora, durata și rutina, apoi îl completezi pe
 * ecranul obișnuit de antrenament. Se încheie la ora aleasă, nu la apăsarea "Termină".
 */
export function BackfillForm({ sessions }: Props) {
  const { userId } = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => localDateStr());
  const [time, setTime] = useState('18:00');
  const [minutes, setMinutes] = useState('60');
  const [routineId, setRoutineId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: routines } = useLive(
    () =>
      db.routines
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );

  const sameDay = sessions.filter((s) => s.kind === 'strength' && localDateStr(new Date(s.started_at)) === date).length;

  const submit = async () => {
    const span = backfillWindow({ date, time, minutes: Number(minutes) });
    if (typeof span === 'string') return setError(span);
    const routine = (routines ?? []).find((r) => r.id === routineId) ?? null;
    try {
      await startSession(userId, routine?.name ?? 'Antrenament Liber', routine, span);
    } catch {
      setError('Nu s-a putut crea antrenamentul.');
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
        <History size={18} />
        Adaugă un antrenament trecut
      </button>
    );
  }

  return (
    <Panel title="Antrenament trecut" edge={D.edge}>
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-muted">
          Pentru un antrenament făcut fără telefon. După ce alegi datele, îl completezi ca pe oricare altul.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bf-date" className="label">
              Ziua
            </label>
            <input id="bf-date" type="date" className="field" value={date} max={localDateStr()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bf-time" className="label">
              Ora de început
            </label>
            <input id="bf-time" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bf-min" className="label">
              Durata (minute)
            </label>
            <input
              id="bf-min"
              inputMode="numeric"
              className="field"
              value={minutes}
              max={BACKFILL_MAX_MINUTES}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bf-routine" className="label">
              Rutina
            </label>
            <select id="bf-routine" className="field" value={routineId} onChange={(e) => setRoutineId(e.target.value)}>
              <option value="">Liber, fără rutină</option>
              {(routines ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sameDay > 0 && (
          <Notice tone="info">
            În ziua aleasă ai deja {sameDay === 1 ? 'un antrenament' : `${sameDay} antrenamente`}. Cel nou se adaugă lângă,
            nu îl înlocuiește.
          </Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <button type="button" className={`btn flex-1 ${D.solid}`} onClick={() => void submit()}>
            Continuă
          </button>
          <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
            Renunță
          </button>
        </div>
      </div>
    </Panel>
  );
}
