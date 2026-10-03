import { useState } from 'react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, type Meal } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { formatNum, parseDecimal, toFieldString } from '../../lib/numbers';
import { fromPer100, per100Of, perServing, recipeTotals } from '../../lib/nutrition';
import { addEntry, MEALS, repeatables, type Repeatable } from '../../lib/nutritionOps';
import { Notice, Segmented, Sheet, Stepper } from '../../components/ui';
import { AmountStep } from './AmountStep';
import { FoodSearch, type PickedFood } from './FoodSearch';
import { QuickAddForm, type QuickAddFormValues } from './QuickAddForm';

const D = DOMAIN.nutrition;

type Tab = 'foods' | 'recipes' | 'quick';

interface Props {
  date: string;
  meal: Meal;
  onClose: () => void;
}

export function AddFoodSheet({ date, meal, onClose }: Props) {
  const { userId } = useApp();
  const [tab, setTab] = useState<Tab>('foods');
  const [picked, setPicked] = useState<PickedFood | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [servings, setServings] = useState('1');
  const [recipeMode, setRecipeMode] = useState<'servings' | 'grams'>('servings');
  const [recipeGrams, setRecipeGrams] = useState('300');
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const { data: again } = useLive(() => repeatables(userId, date), [userId, date]);

  const { data: recipes } = useLive(
    () =>
      db.recipes
        .where('user_id')
        .equals(userId)
        .filter((r) => !r.deleted)
        .toArray(),
    [userId],
  );

  const mealLabel = MEALS.find((m) => m.id === meal)?.label ?? '';

  const addFood = async (food: PickedFood, grams: number) => {
    await addEntry(userId, date, meal, food.name, `${formatNum(grams, 0)} g`, fromPer100(food.per100, grams), food.source);
    setJustAdded(food.name);
    setPicked(null);
  };

  const addRecipe = async () => {
    const recipe = (recipes ?? []).find((r) => r.id === recipeId);
    if (!recipe) return;

    if (recipeMode === 'grams' && recipe.cooked_weight_g) {
      const g = parseDecimal(recipeGrams);
      const p100 = per100Of(recipe);
      if (g === null || g <= 0 || g > 5000 || !p100) return setError('Cantitatea trebuie să fie între 1 și 5000 de grame.');
      await addEntry(userId, date, meal, recipe.name, `${formatNum(g, 0)} g`, fromPer100(p100, g), 'recipe');
    } else {
      const n = parseDecimal(servings);
      if (n === null || n <= 0 || n > 50) return setError('Numărul de porții trebuie să fie între 0,1 și 50.');
      const per = perServing(recipeTotals(recipe.ingredients), recipe.servings);
      const totals = {
        kcal: per.kcal * n,
        protein: per.protein * n,
        carbs: per.carbs * n,
        fat: per.fat * n,
        fiber: per.fiber * n,
        sugar: per.sugar * n,
        sodium: per.sodium * n,
      };
      await addEntry(userId, date, meal, recipe.name, `${formatNum(n)} ${n === 1 ? 'porție' : 'porții'}`, totals, 'recipe');
    }
    setJustAdded(recipe.name);
    setRecipeId(null);
    setError(null);
  };

  const handleQuickAdd = async (data: QuickAddFormValues) => {
    const name = data.name?.trim() || 'Adăugare rapidă';
    await addEntry(
      userId,
      date,
      meal,
      name,
      'rapid',
      { 
        kcal: data.kcal, 
        protein: data.protein, 
        carbs: data.carbs, 
        fat: data.fat, 
        fiber: 0, 
        sugar: 0, 
        sodium: data.sodium 
      },
      'quick',
    );
    setJustAdded(name);
    setError(null);
  };


  const chosenRecipe = (recipes ?? []).find((r) => r.id === recipeId);

  const repeat = async (item: Repeatable) => {
    await addEntry(userId, date, meal, item.name, item.amountText, item.totals, item.source);
    setJustAdded(item.name);
    setError(null);
  };

  return (
    <Sheet title={`Adaugă la ${mealLabel.toLowerCase()}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {justAdded && <Notice tone="ok">Adăugat: {justAdded}.</Notice>}

        {picked ? (
          <AmountStep
            food={picked}
            confirmLabel="Adaugă"
            onBack={() => setPicked(null)}
            onConfirm={(g) => void addFood(picked, g)}
          />
        ) : chosenRecipe ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-display text-2xl font-bold">{chosenRecipe.name}</p>
              <p className="text-muted">
                O porție: {formatNum(perServing(recipeTotals(chosenRecipe.ingredients), chosenRecipe.servings).kcal, 0)} kcal
              </p>
            </div>
            {chosenRecipe.cooked_weight_g && (
              <Segmented<'servings' | 'grams'>
                label="Cum măsori"
                options={[
                  { value: 'servings', label: 'Porții' },
                  { value: 'grams', label: 'Grame de preparat' },
                ]}
                value={recipeMode}
                onChange={setRecipeMode}
                activeClass={D.solid}
              />
            )}
            {recipeMode === 'grams' && chosenRecipe.cooked_weight_g ? (
              <Stepper label="Grame de preparat gata" value={recipeGrams} onChange={setRecipeGrams} step={25} min={0} max={5000} />
            ) : (
              <Stepper label="Câte porții ai mâncat" value={servings} onChange={setServings} step={0.5} min={0} max={50} />
            )}
            {error && <Notice tone="error">{error}</Notice>}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn-quiet" onClick={() => setRecipeId(null)}>
                Înapoi
              </button>
              <button type="button" className={`btn ${D.solid}`} onClick={() => void addRecipe()}>
                Adaugă
              </button>
            </div>
          </div>
        ) : (
          <>
            {(again ?? []).length > 0 && (
              <div>
                <p className="label">Din nou, la {mealLabel.toLowerCase()}</p>
                <ul className="flex flex-col gap-2">
                  {(again ?? []).slice(0, 5).map((item) => (
                    <li key={item.key}>
                      <button type="button" className="btn-quiet w-full justify-between px-3 text-left" onClick={() => void repeat(item)}>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{item.name}</span>
                          <span className="block text-sm font-normal text-muted">
                            {item.amountText}
                            {item.yesterday ? ' · ieri' : item.times > 1 ? ` · de ${item.times} ori` : ''}
                          </span>
                        </span>
                        <span className="num shrink-0 text-lg">{formatNum(item.totals.kcal, 0)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Segmented<Tab>
              label="Ce adaugi"
              options={[
                { value: 'foods', label: 'Alimente' },
                { value: 'recipes', label: 'Rețete' },
                { value: 'quick', label: 'Rapid' },
              ]}
              value={tab}
              onChange={(t) => {
                setTab(t);
                setError(null);
                setJustAdded(null);
              }}
              activeClass={D.solid}
              columns={3}
            />

            {tab === 'foods' && <FoodSearch onPick={setPicked} />}

            {tab === 'recipes' && (
              <ul className="divide-y divide-line border-y border-line bg-fg/5">
                {(recipes ?? []).map((r) => {
                  const per = perServing(recipeTotals(r.ingredients), r.servings);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="flex min-h-[56px] w-full flex-col justify-center px-3 text-left active:bg-fg/5"
                        onClick={() => {
                          setRecipeId(r.id);
                          setServings('1');
                          setRecipeMode('servings');
                          setRecipeGrams(toFieldString(r.cooked_weight_g ? r.cooked_weight_g / r.servings : 300));
                          setJustAdded(null);
                        }}
                      >
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-sm text-muted">
                          {formatNum(per.kcal, 0)} kcal pe porție, proteine {formatNum(per.protein)} g
                        </span>
                      </button>
                    </li>
                  );
                })}
                {(recipes ?? []).length === 0 && (
                  <li className="px-3 py-4 text-muted">Nu ai rețete. Creează una din secțiunea Rețete.</li>
                )}
              </ul>
            )}

            {tab === 'quick' && (
              <QuickAddForm onAdd={handleQuickAdd} />
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

