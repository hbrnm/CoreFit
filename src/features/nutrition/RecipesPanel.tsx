import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, newId, stamp, type LocalRecipe, type RecipeIngredient } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { formatNum, parseDecimal, toFieldString } from '../../lib/numbers';
import { per100Of, perServing, recipeTotals } from '../../lib/nutrition';
import { Notice, Panel, Sheet, Stepper } from '../../components/ui';
import { AmountStep } from './AmountStep';
import { FoodSearch, type PickedFood } from './FoodSearch';
import { RecipeImport, type RecipeDraft } from './RecipeImport';
import { RecipeCatalog } from './RecipeCatalog';

const D = DOMAIN.nutrition;

interface EditorProps {
  recipe: LocalRecipe | null;
  /** completează formularul la creare (venit dintr-un import); ignorat dacă `recipe` e dat */
  draft?: RecipeDraft;
  onClose: () => void;
}

function RecipeEditor({ recipe, draft, onClose }: EditorProps) {
  const { userId } = useApp();
  const [name, setName] = useState(recipe?.name ?? draft?.name ?? '');
  const [servings, setServings] = useState(toFieldString(recipe?.servings ?? draft?.servings ?? 2));
  const [cooked, setCooked] = useState(recipe?.cooked_weight_g ? toFieldString(recipe.cooked_weight_g) : '');
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe?.ingredients ?? draft?.ingredients ?? []);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PickedFood | null>(null);
  const [error, setError] = useState<string | null>(null);

  const servingsN = parseDecimal(servings) ?? 0;
  const cookedN = parseDecimal(cooked);
  const totals = recipeTotals(ingredients);
  const per = perServing(totals, servingsN > 0 ? servingsN : 1);
  const per100 = per100Of({ ingredients, cooked_weight_g: cookedN && cookedN > 0 ? cookedN : null });
  const rawWeight = ingredients.reduce((s, i) => s + i.grams, 0);

  const addIngredient = (food: PickedFood, grams: number) => {
    setIngredients((list) => [...list, { name: food.name, grams, ...food.per100 }]);
    setPicked(null);
    setAdding(false);
  };

  const save = async () => {
    if (name.trim().length < 2) return setError('Dă un nume rețetei.');
    if (ingredients.length === 0) return setError('Adaugă cel puțin un ingredient.');
    if (servingsN <= 0 || servingsN > 100) return setError('Numărul de porții trebuie să fie între 1 și 100.');
    if (cookedN !== null && (cookedN <= 0 || cookedN > 50000)) return setError('Greutatea după gătit nu e validă.');
    try {
      await db.recipes.put({
        id: recipe?.id ?? newId(),
        user_id: userId,
        name: name.trim(),
        servings: servingsN,
        cooked_weight_g: cookedN,
        ingredients,
        notes: notes.trim(),
        deleted: false,
        ...stamp(),
      });
      onClose();
    } catch {
      setError('Rețeta nu s-a putut salva pe dispozitiv.');
    }
  };

  return (
    <Sheet title={recipe ? 'Editează rețeta' : 'Rețetă nouă'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="recipe-name">
            Nume
          </label>
          <input id="recipe-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <Stepper label="Câte porții iese" value={servings} onChange={setServings} step={1} min={1} max={100} />

        <div>
          <p className="label">Ingrediente (greutate crudă)</p>
          <ul className="divide-y divide-steel/10 border-y border-steel/10 bg-white">
            {ingredients.map((ing, i) => (
              <li key={`${ing.name}-${i}`} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ing.name}</p>
                  <p className="text-sm text-steel/60">{formatNum((ing.kcal100 * ing.grams) / 100, 0)} kcal</p>
                </div>
                <input
                  className="field w-24 px-2 text-center"
                  inputMode="decimal"
                  aria-label={`Grame, ${ing.name}`}
                  value={toFieldString(ing.grams)}
                  onChange={(e) => {
                    const g = parseDecimal(e.target.value);
                    setIngredients((list) => list.map((x, idx) => (idx === i ? { ...x, grams: g !== null && g > 0 ? g : 0 } : x)));
                  }}
                />
                <span className="text-sm text-steel/60">g</span>
                <button
                  type="button"
                  aria-label={`Scoate ${ing.name}`}
                  className="-mr-2 flex h-11 w-11 items-center justify-center text-steel/50 active:text-plate-red"
                  onClick={() => setIngredients((list) => list.filter((_, idx) => idx !== i))}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
            {ingredients.length === 0 && <li className="px-3 py-4 text-steel/70">Niciun ingredient încă.</li>}
          </ul>
          <button type="button" className="btn-outline mt-2 w-full" onClick={() => setAdding(true)}>
            <Plus size={18} />
            Adaugă ingredient
          </button>
        </div>

        <div>
          <label className="label" htmlFor="recipe-cooked">
            Greutatea totală după gătit, în grame (opțional)
          </label>
          <input id="recipe-cooked" className="field" inputMode="decimal" value={cooked} onChange={(e) => setCooked(e.target.value)} />
          <p className="mt-1 text-sm text-steel/60">
            Ingredientele se cântăresc crude, dar la gătit se pierde sau se absoarbe apă. Dacă cântărești preparatul
            gata, poți nota apoi porția în grame, iar caloriile la 100 g vor fi corecte. Acum, ingredientele crude
            cântăresc {formatNum(rawWeight, 0)} g.
          </p>
        </div>

        <Panel title="Valori nutriționale">
          <dl className="grid grid-cols-4 gap-2 text-center">
            <div>
              <dt className="text-sm text-steel/60">kcal</dt>
              <dd className="num text-2xl">{formatNum(per.kcal, 0)}</dd>
            </div>
            <div>
              <dt className="text-sm text-steel/60">Proteine</dt>
              <dd className="num text-2xl">{formatNum(per.protein)}</dd>
            </div>
            <div>
              <dt className="text-sm text-steel/60">Carbo</dt>
              <dd className="num text-2xl">{formatNum(per.carbs)}</dd>
            </div>
            <div>
              <dt className="text-sm text-steel/60">Grăsimi</dt>
              <dd className="num text-2xl">{formatNum(per.fat)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-steel/60">Pe o porție.{per100 ? ` La 100 g de preparat: ${formatNum(per100.kcal100, 0)} kcal.` : ''}</p>
        </Panel>

        <div>
          <label className="label" htmlFor="recipe-notes">
            Note (opțional)
          </label>
          <textarea id="recipe-notes" rows={2} className="field py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className={`btn ${D.solid}`} onClick={() => void save()}>
          Salvează rețeta
        </button>
      </div>

      {adding && (
        <Sheet title="Adaugă ingredient" onClose={() => { setAdding(false); setPicked(null); }}>
          {picked ? (
            <AmountStep food={picked} confirmLabel="Adaugă ingredient" onBack={() => setPicked(null)} onConfirm={(g) => addIngredient(picked, g)} />
          ) : (
            <FoodSearch onPick={setPicked} />
          )}
        </Sheet>
      )}
    </Sheet>
  );
}

export function RecipesPanel() {
  const { userId } = useApp();
  const { data: recipes } = useLive(
    () =>
      db.recipes
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );
  const [editing, setEditing] = useState<LocalRecipe | 'new' | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [importing, setImporting] = useState(false);

  const remove = async (r: LocalRecipe) => {
    if (!window.confirm(`Ștergi rețeta „${r.name}”? Mesele deja notate rămân.`)) return;
    await db.recipes.update(r.id, { deleted: true, ...stamp() });
  };

  return (
    <div className="flex flex-col gap-4">
      <RecipeCatalog
        savedIds={new Set((recipes ?? []).filter((recipe) => !recipe.deleted).map((recipe) => recipe.id))}
      />
      <Panel
        title="Rețetele mele"
        edge={D.edge}
        aside={
          <div className="flex gap-1">
            <button type="button" className="flex h-11 w-11 items-center justify-center text-plate-green" aria-label="Importă rețetă" onClick={() => setImporting(true)}>
              <Download size={20} />
            </button>
            <button type="button" className="min-h-[44px] px-1 font-semibold text-plate-green" onClick={() => setEditing('new')}>
              Rețetă nouă
            </button>
          </div>
        }
      >
        {recipes && recipes.length === 0 && (
          <p className="text-steel/70">
            Adaugi ingredientele cu greutatea lor, iar aplicația calculează caloriile pe porție. Poți porni de la o
            rețetă de mai sus: o copiezi, apoi o notezi în jurnal.
          </p>
        )}
        <ul className="divide-y divide-steel/10">
          {recipes?.map((r) => {
            const per = perServing(recipeTotals(r.ingredients), r.servings);
            return (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-sm text-steel/60">
                    {r.servings} {r.servings === 1 ? 'porție' : 'porții'}, {r.ingredients.length} ingrediente
                  </p>
                  <p className="text-[15px]">
                    {formatNum(per.kcal, 0)} kcal pe porție, P {formatNum(per.protein, 0)} C {formatNum(per.carbs, 0)} G {formatNum(per.fat, 0)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="btn-quiet min-h-[44px] px-3" onClick={() => setEditing(r)}>
                    Editează
                  </button>
                  <button
                    type="button"
                    aria-label={`Șterge ${r.name}`}
                    className="flex h-11 w-11 items-center justify-center text-steel/50 active:text-plate-red"
                    onClick={() => void remove(r)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {editing && (
        <RecipeEditor
          recipe={editing === 'new' ? null : editing}
          draft={draft ?? undefined}
          onClose={() => {
            setEditing(null);
            setDraft(null);
          }}
        />
      )}

      {importing && (
        <RecipeImport
          onClose={() => setImporting(false)}
          onImported={(d) => {
            setImporting(false);
            setDraft(d);
            setEditing('new');
          }}
        />
      )}
    </div>
  );
}
