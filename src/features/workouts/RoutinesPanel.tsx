import { useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Link2Off, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context';
import { ROUTINE_TEMPLATES, type RoutineTemplate } from '../../data/routineTemplates';
import { useCatalog } from '../../hooks/useCatalog';
import { useLive } from '../../hooks/useLive';
import { db, newId, stamp, type LocalRoutine, type RoutineExercise } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { parseDecimal } from '../../lib/numbers';
import { findExercise } from '../../lib/workoutStats';
import { DEFAULT_REST_S, startSession } from '../../lib/workoutOps';
import { PROGRESSION_LABELS, type ProgressionKind } from '../../lib/progression';
import { CheckRow, Notice, Panel, Segmented, Sheet, Stepper } from '../../components/ui';
import { ExerciseFigure } from '../../components/ExerciseFigure';
import { ExercisePicker } from './ExercisePicker';

const D = DOMAIN.workouts;

const PROGRESSION_OPTIONS = (Object.keys(PROGRESSION_LABELS) as ProgressionKind[]).map((value) => ({
  value,
  label: PROGRESSION_LABELS[value],
}));

interface EditorProps {
  routine: LocalRoutine | null;
  onClose: () => void;
}

function RoutineEditor({ routine, onClose }: EditorProps) {
  const { userId } = useApp();
  const catalog = useCatalog(userId);
  const [name, setName] = useState(routine?.name ?? '');
  const [notes, setNotes] = useState(routine?.notes ?? '');
  const [rows, setRows] = useState<RoutineExercise[]>(routine?.exercises ?? []);
  const [defaultProgression, setDefaultProgression] = useState<ProgressionKind>(routine?.default_progression ?? 'none');
  const [increment, setIncrement] = useState(String(routine?.progression_increment_kg ?? 2.5).replace('.', ','));
  const [resetPct, setResetPct] = useState(String(Math.round((routine?.progression_reset_pct ?? 0.1) * 100)));
  const [isDeload, setIsDeload] = useState(routine?.is_deload ?? false);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchRow = (index: number, patch: Partial<RoutineExercise>) =>
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const move = (index: number, delta: number) =>
    setRows((r) => {
      const target = index + delta;
      if (target < 0 || target >= r.length) return r;
      const next = [...r];
      [next[index], next[target]] = [next[target], next[index]];
      // "legat de următorul" se referă la poziția din listă, nu la exercițiu: după o mutare,
      // vecinii s-au schimbat, deci legăturile vechi și-ar schimba sensul dacă ar rămâne.
      // Le desfacem explicit, ca utilizatorul să re-lege singur dacă mai are nevoie.
      next[index] = { ...next[index], linked_to_next: false };
      next[target] = { ...next[target], linked_to_next: false };
      if (index > 0) next[index - 1] = { ...next[index - 1], linked_to_next: false };
      if (target > 0) next[target - 1] = { ...next[target - 1], linked_to_next: false };
      return next;
    });

  const numberField = (label: string, value: number, onChange: (n: number) => void, min: number, max: number) => (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="field px-2 text-center"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const n = parseDecimal(e.target.value);
          onChange(n === null ? min : Math.min(max, Math.max(min, Math.round(n))));
        }}
      />
    </label>
  );

  const save = async () => {
    if (name.trim().length < 2) return setError('Dă un nume rutinei.');
    if (rows.length === 0) return setError('Adaugă cel puțin un exercițiu.');
    const inc = parseDecimal(increment);
    if (inc === null || inc < 0 || inc > 100) return setError('Creșterea de greutate trebuie să fie între 0 și 100 kg.');
    const reset = parseDecimal(resetPct);
    if (reset === null || reset < 0 || reset > 90) return setError('Procentul de reset trebuie să fie între 0 și 90.');
    try {
      await db.routines.put({
        id: routine?.id ?? newId(),
        user_id: userId,
        name: name.trim(),
        notes: notes.trim(),
        exercises: rows.map((r) => ({ ...r, rep_max: Math.max(r.rep_min, r.rep_max) })),
        default_progression: defaultProgression,
        progression_increment_kg: inc,
        progression_reset_pct: reset / 100,
        is_deload: isDeload,
        deleted: false,
        ...stamp(),
      });
      onClose();
    } catch {
      setError('Rutina nu s-a putut salva pe dispozitiv.');
    }
  };

  return (
    <Sheet title={routine ? 'Editează rutina' : 'Rutină nouă'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="routine-name" className="label">
            Nume
          </label>
          <input id="routine-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <ul className="flex flex-col gap-1">
          {rows.map((row, i) => (
            <li key={`${row.exercise_id}-${i}`}>
              <div className={`panel p-3 ${row.linked_to_next ? 'border-b-0 rounded-b-none' : ''} ${i > 0 && rows[i - 1].linked_to_next ? 'border-t-0 rounded-t-none' : ''}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ExerciseFigure exerciseId={row.exercise_id} name={findExercise(catalog, row.exercise_id).name} />
                    <p className="min-w-0 truncate font-semibold">
                    {findExercise(catalog, row.exercise_id).name}
                    {row.linked_to_next && <span className="ml-2 rounded bg-workouts/10 px-1.5 py-0.5 text-xs font-semibold text-workouts">superset</span>}
                  </p>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" aria-label="Mută în sus" onClick={() => move(i, -1)} className="flex h-11 w-11 items-center justify-center text-muted">
                      <ArrowUp size={18} />
                    </button>
                    <button type="button" aria-label="Mută în jos" onClick={() => move(i, 1)} className="flex h-11 w-11 items-center justify-center text-muted">
                      <ArrowDown size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Scoate exercițiul"
                      onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                      className="flex h-11 w-11 items-center justify-center text-muted active:text-danger"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {numberField('Serii', row.sets, (n) => patchRow(i, { sets: n }), 1, 20)}
                  {numberField('Rep min', row.rep_min, (n) => patchRow(i, { rep_min: n }), 1, 999)}
                  {numberField('Rep max', row.rep_max, (n) => patchRow(i, { rep_max: n }), 1, 999)}
                  {numberField('Pauză (s)', row.rest_s, (n) => patchRow(i, { rest_s: n }), 0, 600)}
                </div>
                {row.linked_to_next && (
                  <p className="mt-1 text-xs text-subtle">Pauza se aplică după exercițiul următor, nu după acesta.</p>
                )}
                <div className="mt-2">
                  <label className="label" htmlFor={`progression-${i}`}>
                    Progresie pentru acest exercițiu
                  </label>
                  <select
                    id={`progression-${i}`}
                    className="field"
                    value={row.progression ?? ''}
                    onChange={(e) => patchRow(i, { progression: e.target.value === '' ? undefined : (e.target.value as ProgressionKind) })}
                  >
                    <option value="">Ca rutina ({PROGRESSION_LABELS[defaultProgression].toLowerCase()})</option>
                    {PROGRESSION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {i < rows.length - 1 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => patchRow(i, { linked_to_next: !row.linked_to_next })}
                    className={`flex min-h-[32px] items-center gap-1 rounded-b-md px-3 text-xs font-semibold ${row.linked_to_next ? 'bg-workouts/15 text-workouts' : 'bg-fg/10 text-muted'}`}
                  >
                    {row.linked_to_next ? <Link2Off size={14} /> : <Link2 size={14} />}
                    {row.linked_to_next ? 'Desparte de exercițiul următor' : 'Leagă cu exercițiul următor (superset)'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Exercițiile legate formează un superset: le faci pe rând, fără pauză între ele, și te odihnești o singură
          dată, după ultimul din grup.
        </p>

        <button type="button" className="btn-outline" onClick={() => setPicker(true)}>
          <Plus size={18} />
          Adaugă exercițiu
        </button>

        <div className="border-t border-line pt-4">
          <p className="mb-1 font-display text-xl font-bold">Progresie automată</p>
          <p className="mb-3 text-sm text-muted">
            Sugerează greutatea și repetările pentru sesiunea următoare, pe baza celei dinainte. Poți schimba mereu
            valorile sugerate în timpul antrenamentului.
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <span className="label">Regulă implicită pentru toate exercițiile</span>
              <Segmented<ProgressionKind>
                label="Regulă implicită"
                options={PROGRESSION_OPTIONS}
                value={defaultProgression}
                onChange={setDefaultProgression}
                columns={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Creștere (kg)" value={increment} onChange={setIncrement} step={0.5} min={0} max={100} />
              <Stepper label="Reset Greyskull (%)" value={resetPct} onChange={setResetPct} step={5} min={0} max={90} inputMode="numeric" />
            </div>
            <CheckRow checked={isDeload} onChange={setIsDeload} accent={D.accent}>
              Rutină de deload (sesiunile ei nu avansează progresia)
            </CheckRow>
          </div>
        </div>

        <div>
          <label htmlFor="routine-notes" className="label">
            Note (opțional)
          </label>
          <textarea id="routine-notes" rows={2} className="field py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className={`btn ${D.solid}`} onClick={() => void save()}>
          Salvează rutina
        </button>
      </div>

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(false)}
          onPick={(e) => {
            setRows((r) => [...r, { exercise_id: e.id, sets: 3, rep_min: 8, rep_max: 12, rest_s: DEFAULT_REST_S }]);
            setPicker(false);
          }}
        />
      )}
    </Sheet>
  );
}

export function RoutinesPanel() {
  const { userId } = useApp();
  const catalog = useCatalog(userId);
  const { data: routines } = useLive(
    () =>
      db.routines
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );
  const [editing, setEditing] = useState<LocalRoutine | 'new' | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  const beginRoutine = async (r: LocalRoutine) => {
    try {
      await startSession(userId, r.name, r);
    } catch {
      alert('Nu s-a putut porni antrenamentul.');
    }
  };

  const importTemplate = async (t: RoutineTemplate) => {
    for (const day of t.days) {
      await db.routines.put({
        id: newId(),
        user_id: userId,
        name: t.days.length > 1 ? `${t.name}: ${day.name}` : t.name,
        notes: t.description,
        exercises: day.rows.map(([exercise_id, sets, rep_min, rep_max, rest_s]) => ({
          exercise_id,
          sets,
          rep_min,
          rep_max,
          rest_s,
        })),
        default_progression: 'none',
        progression_increment_kg: 2.5,
        progression_reset_pct: 0.1,
        is_deload: false,
        deleted: false,
        ...stamp(),
      });
    }
    setImported(t.id);
  };

  const remove = async (r: LocalRoutine) => {
    if (!window.confirm(`Ștergi rutina „${r.name}”?`)) return;
    await db.routines.update(r.id, { deleted: true, ...stamp() });
  };

  const duplicate = async (r: LocalRoutine) => {
    await db.routines.put({
      ...r,
      id: newId(),
      name: `${r.name} (copie)`,
      exercises: r.exercises.map((e) => ({ ...e })),
      deleted: false,
      ...stamp(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Rutinele mele"
       
        aside={
          <button type="button" className="min-h-[44px] px-1 font-semibold text-brand-fg" onClick={() => setEditing('new')}>
            Rutină nouă
          </button>
        }
      >
        {routines && routines.length === 0 && (
          <p className="text-muted">Încă nu ai rutine. Adaugă un șablon de mai jos sau creează una de la zero.</p>
        )}
        <ul className="divide-y divide-line">
          {routines?.map((r) => (
            <li key={r.id} className="py-3">
              <p className="text-[17px] font-semibold">
                {r.name}
                {r.is_deload && <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-muted">deload</span>}
              </p>
              <p className="mt-0.5 text-[15px] text-muted">
                {r.exercises.map((e) => findExercise(catalog, e.exercise_id).name).join(', ')}
              </p>
              {r.default_progression !== 'none' && (
                <p className="text-sm text-subtle">Progresie: {PROGRESSION_LABELS[r.default_progression].toLowerCase()}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <button type="button" className="btn-primary min-h-[44px] px-5" onClick={() => void beginRoutine(r)}>
                  Începe
                </button>
                <button type="button" className="btn min-h-[44px] bg-fg/[0.07] px-4 text-fg" onClick={() => setEditing(r)}>
                  Editează
                </button>
                <button type="button" className="btn min-h-[44px] bg-fg/[0.07] px-4 text-fg" onClick={() => void duplicate(r)}>
                  Copie
                </button>
                <button
                  type="button"
                  aria-label={`Șterge ${r.name}`}
                  className="ml-auto flex h-11 w-11 items-center justify-center text-subtle active:text-danger"
                  onClick={() => void remove(r)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Șabloane">
        <ul className="flex flex-col gap-4">
          {ROUTINE_TEMPLATES.map((t) => (
            <li key={t.id}>
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-muted">
                {t.level}, {t.daysPerWeek} zile pe săptămână, {t.days.length} {t.days.length === 1 ? 'antrenament' : 'antrenamente'}
              </p>
              <p className="mt-1 text-[15px] text-fg">{t.description}</p>
              <button type="button" className="btn-quiet mt-2" onClick={() => void importTemplate(t)}>
                <Plus size={18} />
                Adaugă în rutinele mele
              </button>
              {imported === t.id && <p className="mt-1 text-sm text-success">Adăugat.</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Șabloanele sunt puncte de plecare uzuale, nu programe personalizate. Ajustează seriile, repetările și
          greutățile după cum le tolerezi.
        </p>
      </Panel>

      {editing && (
        <RoutineEditor routine={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
