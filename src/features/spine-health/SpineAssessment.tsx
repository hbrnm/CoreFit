import { useState } from 'react';
import Dexie from 'dexie';
import { useApp } from '../../context';
import { db, newId, stamp, type LocalSpineAssessment } from '../../lib/db';
import { useLive } from '../../hooks/useLive';
import { formatDateTime } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { CheckRow, Notice, Panel, SyncMark } from '../../components/ui';

const D = DOMAIN.health;

interface Flags {
  flexion: boolean;
  extension: boolean;
  compression: boolean;
  scab: boolean;
}

/** Recomandări orientative, în spiritul abordării McGill. Nu sunt diagnostic. */
function buildRecommendation(f: Flags): string {
  const lines: string[] = [];
  if (f.flexion) {
    lines.push('Evită flexia lombară încărcată (ridicări cu spatele rotunjit, sit-up-uri). Folosește hip hinge cu coloana neutră.');
  }
  if (f.extension) {
    lines.push('Evită extensia lombară la capătul amplitudinii (spate arcuit la presă, poduri). Păstrează coastele stivuite peste bazin.');
  }
  if (f.compression) {
    lines.push('Redu încărcarea axială (genuflexiuni și deadlift grele). Alege variante mai ușoare sau unilaterale și crește greutatea treptat.');
  }
  if (f.scab) {
    lines.push('Oprește repetarea mișcării sau a poziției care îți provoacă durerea: lasă zona să se calmeze înainte s-o mai provoci.');
  }
  if (lines.length === 0) {
    lines.push('Nicio intoleranță raportată. Continuă cu Big 3 și cu progresie treptată a încărcării.');
  }
  return lines.join('\n');
}

function summarize(a: LocalSpineAssessment): string {
  const parts: string[] = [];
  if (a.flexion_intolerant) parts.push('flexie');
  if (a.extension_intolerant) parts.push('extensie');
  if (a.compression_intolerant) parts.push('compresie');
  if (a.active_scab_picking_identified) parts.push('mișcare provocatoare repetată');
  return parts.length > 0 ? `Intoleranță: ${parts.join(', ')}` : 'Fără intoleranțe raportate';
}

export function SpineAssessment() {
  const { userId } = useApp();
  const [flags, setFlags] = useState<Flags>({ flexion: false, extension: false, compression: false, scab: false });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: history } = useLive(
    () =>
      db.spineAssessments
        .where('[user_id+assessed_at]')
        .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
        .reverse()
        .filter((a) => !a.deleted)
        .limit(5)
        .toArray(),
    [userId],
  );

  const recommendation = buildRecommendation(flags);

  const toggle = (key: keyof Flags) => (checked: boolean) => {
    setSaved(false);
    setFlags((prev) => ({ ...prev, [key]: checked }));
  };

  const save = async () => {
    try {
      await db.spineAssessments.put({
        id: newId(),
        user_id: userId,
        assessed_at: new Date().toISOString(),
        flexion_intolerant: flags.flexion,
        extension_intolerant: flags.extension,
        compression_intolerant: flags.compression,
        active_scab_picking_identified: flags.scab,
        recommended_movement: recommendation,
        deleted: false,
        ...stamp(),
      });
      setError(null);
      setSaved(true);
    } catch {
      setError('Evaluarea nu s-a putut salva pe dispozitiv. Verifică spațiul de stocare.');
    }
  };

  return (
    <Panel title="Evaluare rapidă a coloanei" edge={D.edge}>
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-steel/80">Bifează ce îți provoacă disconfort acum.</p>

        <div>
          <CheckRow checked={flags.flexion} onChange={toggle('flexion')} accent={D.accent}>
            Flexia (aplecatul înainte, spatele rotunjit)
          </CheckRow>
          <CheckRow checked={flags.extension} onChange={toggle('extension')} accent={D.accent}>
            Extensia (spatele arcuit înapoi)
          </CheckRow>
          <CheckRow checked={flags.compression} onChange={toggle('compression')} accent={D.accent}>
            Compresia (greutate pe umeri sau în mâini, ca la genuflexiuni și deadlift)
          </CheckRow>
          <CheckRow checked={flags.scab} onChange={toggle('scab')} accent={D.accent}>
            Repet o mișcare sau o poziție despre care știu că îmi provoacă durerea
          </CheckRow>
        </div>

        <Notice tone="info" title="Recomandare orientativă">
          <p className="whitespace-pre-line">{recommendation}</p>
          <p className="mt-2 text-sm text-steel/70">
            Nu înlocuiește evaluarea unui medic sau a unui kinetoterapeut.
          </p>
        </Notice>

        {error && <Notice tone="error">{error}</Notice>}
        {saved && <Notice tone="info">Evaluare salvată.</Notice>}

        <button type="button" onClick={() => void save()} className={`btn ${D.solid}`}>
          Salvează evaluarea
        </button>

        {history && history.length > 0 && (
          <div className="mt-2 border-t border-steel/10 pt-3">
            <h3 className="mb-1 font-display text-lg font-bold">Ultimele evaluări</h3>
            <ul className="divide-y divide-steel/10">
              {history.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-[15px]">{summarize(a)}</p>
                    <p className="text-sm text-steel/55">{formatDateTime(a.assessed_at)}</p>
                  </div>
                  <SyncMark status={a.sync_status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}
