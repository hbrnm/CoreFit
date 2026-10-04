import { useMemo, useState } from 'react';
import { Pencil, Plus, Star } from 'lucide-react';
import {
  BUILTIN_EXERCISES,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  type Equipment,
  type Exercise,
  type ExerciseKind,
  type Muscle,
} from '../../data/exercises';
import { useApp } from '../../context';
import { useCatalog } from '../../hooks/useCatalog';
import { db, newId, saveProfilePatch, stamp } from '../../lib/db';
import { cx } from '../../lib/cx';
import { normalize } from '../../lib/ingredients';
import { DOMAIN } from '../../lib/domains';
import { Notice, Segmented, Sheet } from '../../components/ui';
import { ExerciseFigure } from '../../components/ExerciseFigure';

const D = DOMAIN.workouts;

const KIND_OPTIONS: ReadonlyArray<{ value: ExerciseKind; label: string }> = [
  { value: 'reps', label: 'Greutate' },
  { value: 'bodyweight', label: 'Corp' },
  { value: 'duration', label: 'Durată' },
];

const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[];
const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[];

interface Props {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ onPick, onClose }: Props) {
  const { userId, profile } = useApp();
  const catalog = useCatalog(userId);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all');
  const [gear, setGear] = useState<Equipment | 'all'>('all');
  /** exercițiul propriu în editare; null = exercițiu nou */
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [newMuscle, setNewMuscle] = useState<Muscle>('chest');
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [kind, setKind] = useState<ExerciseKind>('reps');
  const [error, setError] = useState<string | null>(null);

  const favorites = new Set(profile?.favorite_exercise_ids ?? []);
  const all = useMemo(() => {
    const list = [...catalog.values(), ...BUILTIN_EXERCISES];
    const seen = new Set<string>();
    return list.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  }, [catalog]);

  // fără diacritice și și după numele englezesc: „impins”, „bench press”
  const q = normalize(query.trim());
  const shown = all
    .filter((e) => (muscle === 'all' || e.muscle === muscle) && (q === '' || normalize(`${e.name} ${e.en ?? ''}`).includes(q)))
    .filter((e) => gear === 'all' || e.equipment === gear)
    .filter((e) => !onlyFavorites || favorites.has(e.id))
    .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || a.name.localeCompare(b.name, 'ro'));

  const toggleFavorite = (id: string) => {
    const current = profile?.favorite_exercise_ids ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    void saveProfilePatch(userId, { favorite_exercise_ids: next });
  };

  const openForm = (exercise: Exercise | null) => {
    setEditing(exercise);
    setName(exercise?.name ?? '');
    setNewMuscle(exercise?.muscle ?? 'chest');
    setEquipment(exercise?.equipment ?? 'dumbbell');
    setKind(exercise?.kind ?? 'reps');
    setError(null);
    setCreating(true);
  };

  const saveExercise = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError('Scrie numele exercițiului.');
    const id = editing?.id ?? newId();
    try {
      await db.customExercises.put({
        id,
        user_id: userId,
        name: trimmed,
        muscle: newMuscle,
        equipment,
        kind,
        deleted: false,
        ...stamp(),
      });
      if (editing) {
        // seriile notate păstrează numele de atunci; aici se schimbă doar exercițiul pentru viitor
        setCreating(false);
        setEditing(null);
      } else {
        onPick({ id, name: trimmed, muscle: newMuscle, equipment, kind, custom: true });
      }
    } catch {
      setError('Exercițiul nu s-a putut salva pe dispozitiv.');
    }
  };

  const deleteExercise = async () => {
    if (!editing) return;
    if (!window.confirm(`Ștergi ${editing.name}? Seriile notate rămân în istoric.`)) return;
    await db.customExercises.update(editing.id, { deleted: true, ...stamp() });
    setCreating(false);
    setEditing(null);
  };

  if (creating) {
    return (
      <Sheet title={editing ? 'Exercițiul tău' : 'Exercițiu nou'} onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="ex-name" className="label">
              Nume
            </label>
            <input id="ex-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ex-muscle" className="label">
              Grupa musculară principală
            </label>
            <select
              id="ex-muscle"
              className="field"
              value={newMuscle}
              onChange={(e) => setNewMuscle(e.target.value as Muscle)}
            >
              {MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ex-equipment" className="label">
              Echipament
            </label>
            <select
              id="ex-equipment"
              className="field"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
            >
              {EQUIPMENT.map((m) => (
                <option key={m} value={m}>
                  {EQUIPMENT_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Cum se notează</span>
            <Segmented<ExerciseKind>
              label="Tip de exercițiu"
              options={KIND_OPTIONS}
              value={kind}
              onChange={setKind}
              activeClass={D.solid}
              columns={3}
            />
            <p className="mt-2 text-sm text-muted">
              Greutate: kg și repetări. Corp: repetări, cu greutate adăugată opțional. Durată: secunde.
              {editing && ' Schimbarea tipului nu modifică seriile notate deja.'}
            </p>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-quiet" onClick={() => setCreating(false)}>
              Înapoi
            </button>
            <button type="button" className={`btn ${D.solid}`} onClick={() => void saveExercise()}>
              Salvează
            </button>
          </div>
          {editing && (
            <button type="button" className="btn-danger" onClick={() => void deleteExercise()}>
              Șterge exercițiul
            </button>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Alege exercițiul" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          className="field"
          type="search"
          placeholder="Caută un exercițiu"
          aria-label="Caută un exercițiu"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {(['all', ...MUSCLES] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(m)}
              aria-pressed={muscle === m}
              className={cx(
                'btn min-h-[40px] shrink-0 px-3 text-sm',
                muscle === m ? D.solid : 'border border-line bg-fg/5 text-fg',
              )}
            >
              {m === 'all' ? 'Toate' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" role="group" aria-label="Echipament">
          {(['all', ...EQUIPMENT] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGear(g)}
              aria-pressed={gear === g}
              className={cx(
                'btn min-h-[40px] shrink-0 px-3 text-sm',
                gear === g ? D.solid : 'border border-line bg-fg/5 text-fg',
              )}
            >
              {g === 'all' ? 'Orice echipament' : EQUIPMENT_LABELS[g]}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={onlyFavorites}
          className={cx('btn min-h-[44px]', onlyFavorites ? D.solid : 'border border-line bg-fg/5 text-fg')}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          <Star size={16} />
          {onlyFavorites ? 'Doar favorite' : 'Arată favoritele primele'}
        </button>

        <ul className="divide-y divide-line border-y border-line bg-fg/5">
          {shown.map((e) => (
            <li key={e.id} className="flex items-stretch">
              <button
                type="button"
                aria-label={favorites.has(e.id) ? `Scoate ${e.name} de la favorite` : `Marchează ${e.name} ca favorit`}
                aria-pressed={favorites.has(e.id)}
                className={`flex w-12 items-center justify-center ${favorites.has(e.id) ? 'text-warning' : 'text-subtle'}`}
                onClick={() => toggleFavorite(e.id)}
              >
                <Star size={18} fill={favorites.has(e.id) ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex min-h-[56px] flex-1 items-center gap-3 pr-3 text-left active:bg-fg/5"
              >
                <ExerciseFigure exerciseId={e.id} name={e.name} />
                <span className="flex min-w-0 flex-col justify-center">
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-sm text-muted">
                    {MUSCLE_LABELS[e.muscle]}, {EQUIPMENT_LABELS[e.equipment]}
                    {e.custom ? ', al tău' : ''}
                  </span>
                </span>
              </button>
              {e.custom && (
                <button
                  type="button"
                  aria-label={`Editează ${e.name}`}
                  className="flex w-12 items-center justify-center text-muted"
                  onClick={() => openForm(e)}
                >
                  <Pencil size={16} />
                </button>
              )}
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-4 text-muted">Niciun exercițiu găsit.</li>}
        </ul>

        <button type="button" className="btn-outline" onClick={() => openForm(null)}>
          <Plus size={18} />
          Exercițiu nou
        </button>
      </div>
    </Sheet>
  );
}
