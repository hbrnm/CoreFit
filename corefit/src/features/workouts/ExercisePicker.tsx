import { useMemo, useState } from 'react';
import { Plus, Star } from 'lucide-react';
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

  const q = query.trim().toLowerCase();
  const shown = all
    .filter((e) => (muscle === 'all' || e.muscle === muscle) && (q === '' || e.name.toLowerCase().includes(q)))
    .filter((e) => !onlyFavorites || favorites.has(e.id))
    .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || a.name.localeCompare(b.name, 'ro'));

  const toggleFavorite = (id: string) => {
    const current = profile?.favorite_exercise_ids ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    void saveProfilePatch(userId, { favorite_exercise_ids: next });
  };

  const createExercise = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError('Scrie numele exercițiului.');
    const id = newId();
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
      onPick({ id, name: trimmed, muscle: newMuscle, equipment, kind, custom: true });
    } catch {
      setError('Exercițiul nu s-a putut salva pe dispozitiv.');
    }
  };

  if (creating) {
    return (
      <Sheet title="Exercițiu nou" onClose={onClose}>
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
            <p className="mt-2 text-sm text-steel/70">
              Greutate: kg și repetări. Corp: repetări, cu greutate adăugată opțional. Durată: secunde.
            </p>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-quiet" onClick={() => setCreating(false)}>
              Înapoi
            </button>
            <button type="button" className={`btn ${D.solid}`} onClick={() => void createExercise()}>
              Salvează
            </button>
          </div>
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
                muscle === m ? D.solid : 'border border-steel/30 bg-white text-steel',
              )}
            >
              {m === 'all' ? 'Toate' : MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={onlyFavorites}
          className={cx('btn min-h-[44px]', onlyFavorites ? D.solid : 'border border-steel/30 bg-white text-steel')}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          <Star size={16} />
          {onlyFavorites ? 'Doar favorite' : 'Arată favoritele primele'}
        </button>

        <ul className="divide-y divide-steel/10 border-y border-steel/10 bg-white">
          {shown.map((e) => (
            <li key={e.id} className="flex items-stretch">
              <button
                type="button"
                aria-label={favorites.has(e.id) ? `Scoate ${e.name} de la favorite` : `Marchează ${e.name} ca favorit`}
                aria-pressed={favorites.has(e.id)}
                className="flex w-12 items-center justify-center text-plate-red"
                onClick={() => toggleFavorite(e.id)}
              >
                <Star size={18} fill={favorites.has(e.id) ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex min-h-[56px] flex-1 items-center gap-3 pr-3 text-left active:bg-steel/5"
              >
                <ExerciseFigure exerciseId={e.id} name={e.name} />
                <span className="flex min-w-0 flex-col justify-center">
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-sm text-steel/60">
                    {MUSCLE_LABELS[e.muscle]}, {EQUIPMENT_LABELS[e.equipment]}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-4 text-steel/70">Niciun exercițiu găsit.</li>}
        </ul>

        <button type="button" className="btn-outline" onClick={() => setCreating(true)}>
          <Plus size={18} />
          Exercițiu nou
        </button>
      </div>
    </Sheet>
  );
}
