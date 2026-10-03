import { useState } from 'react';
import Dexie from 'dexie';
import { Trash2 } from 'lucide-react';
import { REGIONS, REGION_LABELS } from '../../data/health';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, newId, nowIso, stamp, type RegionId } from '../../lib/db';
import { formatDateTime, formatDayMonth, localDateStr } from '../../lib/date';
import { DOMAIN, tone } from '../../lib/domains';
import { LineChart } from '../../components/charts';
import { Notice, Panel, SyncMark } from '../../components/ui';
import { PainPicker } from './PainPicker';

const D = DOMAIN.health;

export function PainTracker() {
  const { userId } = useApp();
  const [region, setRegion] = useState<RegionId>('lower_back');
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: logs } = useLive(
    () =>
      db.painLogs
        .where('[user_id+logged_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .filter((l) => !l.deleted)
        .toArray(),
    [userId],
  );

  const forRegion = (logs ?? []).filter((l) => l.region === region).sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  // o valoare pe zi, ultima notată, ca graficul să nu fie aglomerat
  const byDay = new Map<string, number>();
  for (const l of forRegion) byDay.set(localDateStr(new Date(l.logged_at)), l.score);
  const points = [...byDay.entries()].map(([date, y]) => ({ label: formatDayMonth(date), y }));

  const save = async () => {
    if (score === null) return setError('Alege un număr de la 0 la 10.');
    try {
      await db.painLogs.put({
        id: newId(),
        user_id: userId,
        region,
        score,
        note: note.trim(),
        logged_at: nowIso(),
        deleted: false,
        ...stamp(),
      });
      setError(null);
      setSaved(true);
      setScore(null);
      setNote('');
    } catch {
      setError('Nu s-a putut salva pe dispozitiv. Verifică spațiul de stocare.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Notează durerea" edge={D.edge}>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="pain-region" className="label">
              Zona
            </label>
            <select
              id="pain-region"
              className="field"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value as RegionId);
                setSaved(false);
              }}
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Cât de tare doare acum (0 = deloc, 10 = maxim)</span>
            <PainPicker
              label="Nivel de durere"
              value={score}
              onChange={(n) => {
                setScore(n);
                setSaved(false);
              }}
            />
          </div>
          <div>
            <label htmlFor="pain-note" className="label">
              Notă (opțional)
            </label>
            <input id="pain-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {saved && <Notice tone="ok">Notat.</Notice>}
          <button type="button" className={`btn ${D.solid}`} onClick={() => void save()}>
            Salvează
          </button>
        </div>
      </Panel>

      <Panel title={`Evoluția, ${REGION_LABELS[region].toLowerCase()}`}>
        {points.length === 0 ? (
          <p className="text-muted">Nicio notare pentru această zonă încă.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <LineChart points={points} color={tone('health')} unit="/10" />
            <ul className="divide-y divide-line">
              {[...forRegion].reverse().slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2">
                  <span className="num w-8 text-2xl">{l.score}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">{formatDateTime(l.logged_at)}</p>
                    {l.note && <p className="truncate text-[15px]">{l.note}</p>}
                  </div>
                  <SyncMark status={l.sync_status} />
                  <button
                    type="button"
                    aria-label="Șterge notarea"
                    className="-mr-2 flex h-11 w-11 items-center justify-center text-subtle active:text-danger"
                    onClick={() => void db.painLogs.update(l.id, { deleted: true, ...stamp() })}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
