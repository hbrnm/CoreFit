import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Download, FileUp, Share2, Upload } from 'lucide-react';
import { BUILTIN_EXERCISES, MUSCLE_LABELS, type Muscle } from '../../data/exercises';
import { useApp } from '../../context';
import { applyBackup, downloadBackup, readBackup } from '../../lib/backup';
import { db, newId, saveProfilePatch, stamp } from '../../lib/db';
import { localDateStr } from '../../lib/date';
import { DOMAIN } from '../../lib/domains';
import { plural } from '../../lib/numbers';
import { parseImport, SOURCE_LABELS, type ParsedImport, type WeightUnit } from '../../lib/importCsv';
import { applyImport, countAlreadyImported } from '../../lib/importOps';
import { planImport, type ImportPlan } from '../../lib/importPlan';
import { buildPlanFile, mergePlan, readPlanFile } from '../../lib/planShare';
import { Notice, Panel, Segmented } from '../../components/ui';

const D = DOMAIN.profile;

const DAY_NAMES: Record<string, string> = { '1': 'luni', '2': 'marți', '3': 'miercuri', '4': 'joi', '5': 'vineri', '6': 'sâmbătă', '7': 'duminică' };

function saveJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Butonul care deschide alegerea unui fișier; `onFile` primește conținutul ca text. */
function FilePick({ label, accept, onFile, icon }: { label: string; accept: string; onFile: (text: string) => void; icon: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void file.text().then(onFile);
  };
  return (
    <>
      <button type="button" className="btn-outline" onClick={() => input.current?.click()}>
        {icon}
        {label}
      </button>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={pick} aria-hidden="true" tabIndex={-1} />
    </>
  );
}

const fmtDay = (d: Date): string => d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

function CsvImport() {
  const { userId } = useApp();
  const [text, setText] = useState<string | null>(null);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [preview, setPreview] = useState<{ parsed: ParsedImport; plan: ImportPlan; already: number } | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** grupa aleasă de utilizator pentru exercițiile noi fără grupă în fișier */
  const [muscles, setMuscles] = useState<Record<string, Muscle>>({});

  const analyze = async (csv: string, u: WeightUnit) => {
    setMessage(null);
    const parsed = parseImport(csv, u);
    if (typeof parsed === 'string') {
      setPreview(null);
      return setMessage({ tone: 'error', text: parsed });
    }
    const custom = await db.customExercises.where('user_id').equals(userId).toArray();
    const plan = await planImport(parsed, userId, BUILTIN_EXERCISES, custom, stamp());
    setPreview({ parsed, plan, already: await countAlreadyImported(plan) });
  };

  const onFile = (csv: string) => {
    setText(csv);
    void analyze(csv, unit);
  };

  const changeUnit = (u: WeightUnit) => {
    setUnit(u);
    if (text) void analyze(text, u);
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const plan = {
        ...preview.plan,
        newCustom: preview.plan.newCustom.map((c) => (muscles[c.name] ? { ...c, muscle: muscles[c.name] } : c)),
      };
      const done = await applyImport(plan);
      setMessage({
        tone: 'ok',
        text: `Importat: ${plural(done.sessions, 'antrenament', 'antrenamente')}, ${plural(done.sets, 'serie', 'serii')}${done.exercises ? `, ${plural(done.exercises, 'exercițiu nou', 'exerciții noi')}` : ''}. Le găsești în Antrenament, Istoric.`,
      });
      setPreview(null);
      setText(null);
      setMuscles({});
    } catch {
      setMessage({ tone: 'error', text: 'Importul nu s-a putut salva pe dispozitiv. Nu s-a scris nimic.' });
    } finally {
      setBusy(false);
    }
  };

  const p = preview;
  const fresh = p ? p.plan.sessions.length - p.already : 0;
  return (
    <Panel title="Import din altă aplicație">
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-muted">
          Exportul CSV din Hevy, Strong sau FitNotes. Fișierul se citește pe telefon și nu pleacă nicăieri. Un import
          repetat nu dublează antrenamentele.
        </p>
        <FilePick label="Alege fișierul CSV" accept=".csv,text/csv" onFile={onFile} icon={<FileUp size={18} />} />

        {p && (
          <>
            {p.parsed.unitFromUser && (
              <Segmented<WeightUnit>
                label="Greutățile din fișier sunt în"
                options={[
                  { value: 'kg', label: 'kilograme' },
                  { value: 'lb', label: 'livre (lb)' },
                ]}
                value={unit}
                onChange={changeUnit}
                activeClass={D.solid}
                columns={2}
              />
            )}
            <div className="rounded-md bg-fg/5 p-3 text-[15px]">
              <p className="font-semibold">
                {SOURCE_LABELS[p.parsed.source]}: {plural(p.plan.sessions.length, 'antrenament', 'antrenamente')}, {plural(p.plan.logs.length, 'serie', 'serii')}
              </p>
              <p className="text-muted">
                {fmtDay(p.parsed.workouts[0].startedAt)} – {fmtDay(p.parsed.workouts[p.parsed.workouts.length - 1].startedAt)}
              </p>
              <p className="mt-2">
                {plural(p.plan.matched.length, 'exercițiu recunoscut', 'exerciții recunoscute')}
                {p.plan.newCustom.length > 0 && `, ${plural(p.plan.newCustom.length, 'nou (devine exercițiu propriu)', 'noi (devin exerciții proprii)')}`}.
              </p>
              {p.plan.newCustom.length > 0 && (
                <p className="text-muted">
                  {p.plan.newCustom.length === 1 ? 'Nou' : 'Noi'}: {p.plan.newCustom.map((c) => c.name).join(', ')}
                </p>
              )}
              {p.plan.guessedMuscle.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-muted">Fișierul nu spune grupa musculară. Alege-o acum, pentru statistici corecte:</p>
                  {p.plan.guessedMuscle.map((name, i) => (
                    <label key={name} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{name}</span>
                      <select
                        className="field w-44"
                        aria-label={`Grupa musculară pentru ${name}`}
                        value={muscles[name] ?? 'core'}
                        onChange={(e) => setMuscles((m) => ({ ...m, [name]: e.target.value as Muscle }))}
                        id={`import-muscle-${i}`}
                      >
                        {(Object.keys(MUSCLE_LABELS) as Muscle[]).map((m) => (
                          <option key={m} value={m}>
                            {MUSCLE_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
              {p.parsed.skippedRows > 0 && (
                <p className="text-muted">
                  {plural(p.parsed.skippedRows, 'rând', 'rânduri')} fără repetări sau durată (de ex. cardio pe distanță){' '}
                  {p.parsed.skippedRows === 1 ? 'se sare' : 'se sar'}.
                </p>
              )}
              {p.already > 0 && (
                <p className="text-muted">
                  {p.already === 1 ? 'Un antrenament e deja importat și rămâne' : `${plural(p.already, 'antrenament', 'antrenamente')} sunt deja importate și rămân`} cum{' '}
                  {p.already === 1 ? 'este' : 'sunt'}.
                </p>
              )}
              {p.plan.matched.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Cum s-au potrivit exercițiile</summary>
                  <ul className="mt-1 text-fg">
                    {p.plan.matched.map((m) => (
                      <li key={m.from}>
                        {m.from} → {m.to}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <button type="button" className={`btn ${D.solid}`} disabled={busy || fresh === 0} onClick={() => void run()}>
              {fresh === 0 ? 'Nimic nou de importat' : `Importă ${plural(fresh, 'antrenament', 'antrenamente')}`}
            </button>
          </>
        )}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </Panel>
  );
}

function PlanShare() {
  const { userId, profile } = useApp();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const share = async () => {
    const [routines, custom] = await Promise.all([
      db.routines.where('user_id').equals(userId).toArray(),
      db.customExercises.where('user_id').equals(userId).toArray(),
    ]);
    const file = buildPlanFile(routines, custom, profile?.week_slots ?? {});
    if (file.routines.length === 0) return setMessage({ tone: 'error', text: 'Nu ai încă rutine de trimis.' });
    saveJson(file, `corefit-plan-${localDateStr()}.json`);
    setMessage({ tone: 'ok', text: `Planul cu ${plural(file.routines.length, 'rutină', 'rutine')} e salvat. Trimite fișierul cui vrei.` });
  };

  const receive = async (text: string) => {
    setMessage(null);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return setMessage({ tone: 'error', text: 'Fișierul nu e JSON.' });
    }
    const plan = readPlanFile(raw);
    if (typeof plan === 'string') return setMessage({ tone: 'error', text: plan });
    const [routines, custom] = await Promise.all([
      db.routines.where('user_id').equals(userId).toArray(),
      db.customExercises.where('user_id').equals(userId).toArray(),
    ]);
    const merged = mergePlan(plan, userId, routines, custom, profile?.week_slots ?? {}, newId, stamp());
    await db.transaction('rw', db.routines, db.customExercises, async () => {
      await db.customExercises.bulkPut(merged.customExercises);
      await db.routines.bulkPut(merged.routines);
    });
    await saveProfilePatch(userId, { week_slots: merged.weekSlots });
    const busy = merged.busyDays.map((d) => DAY_NAMES[d]).join(', ');
    setMessage({
      tone: 'ok',
      text: `Am adăugat ${plural(merged.routines.length, 'rutină', 'rutine')}${busy ? `. Zilele ${busy} erau ocupate și au rămas cu rutinele tale` : ''}.`,
    });
  };

  return (
    <Panel title="Planul tău">
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-muted">
          Rutinele și zilele lor, într-un fișier mic, fără antrenamente sau date personale. Un plan primit se adaugă lângă al
          tău și nu îl înlocuiește.
        </p>
        <button type="button" className="btn-outline" onClick={() => void share()}>
          <Share2 size={18} />
          Salvează planul ca fișier
        </button>
        <FilePick label="Adaugă un plan primit" accept=".json,application/json" onFile={(t) => void receive(t)} icon={<FileUp size={18} />} />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </Panel>
  );
}

function Backup() {
  const { userId } = useApp();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const restore = async (text: string) => {
    setMessage(null);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return setMessage({ tone: 'error', text: 'Fișierul nu e JSON.' });
    }
    const backup = readBackup(raw);
    if (!backup.ok) return setMessage({ tone: 'error', text: backup.error });
    if (!window.confirm('Adaug datele din copie? Ce ai pe telefon rămâne; unde același rând există în ambele, câștigă versiunea mai nouă.')) return;
    try {
      await applyBackup(userId, backup.data, 'merge');
      setMessage({ tone: 'ok', text: 'Copia a fost adăugată.' });
    } catch {
      setMessage({ tone: 'error', text: 'Copia nu s-a putut restaura. Nu s-a schimbat nimic.' });
    }
  };

  return (
    <Panel title="Copie de siguranță">
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-muted">
          Toate datele tale, într-un fișier JSON. Păstrează-l în iCloud Drive sau Google Drive, mai ales dacă folosești
          aplicația fără cont.
        </p>
        <button type="button" className={`btn ${D.solid}`} onClick={() => void downloadBackup(userId)}>
          <Download size={18} />
          Descarcă o copie
        </button>
        <FilePick label="Restaurează dintr-o copie" accept=".json,application/json" onFile={(t) => void restore(t)} icon={<Upload size={18} />} />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </Panel>
  );
}

export function DataPanel() {
  return (
    <div className="flex flex-col gap-4">
      <Backup />
      <CsvImport />
      <PlanShare />
    </div>
  );
}
