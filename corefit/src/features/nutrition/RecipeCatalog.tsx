import { useState } from 'react';
import { CATALOG_RECIPES, catalogRecipeKey, type RecipeCuisine } from '../../data/recipes';
import { useApp } from '../../context';
import { db, stamp } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { formatNum } from '../../lib/numbers';
import { perServing, recipeTotals } from '../../lib/nutrition';
import { Notice, Panel, Segmented } from '../../components/ui';

const D = DOMAIN.nutrition;

const FILTERS: ReadonlyArray<{ value: RecipeCuisine; label: string }> = [
  { value: 'tastemotions', label: 'Meniu' },
  { value: 'mediterranean', label: 'Mediterană' },
  { value: 'world', label: 'Din lume' },
];

export function RecipeCatalog({ savedIds }: { savedIds: ReadonlySet<string> }) {
  const { userId } = useApp();
  const [cuisine, setCuisine] = useState<RecipeCuisine>('tastemotions');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const shown = CATALOG_RECIPES.filter((recipe) => recipe.cuisine === cuisine);

  const add = async (id: string) => {
    const recipe = CATALOG_RECIPES.find((item) => item.id === id);
    if (!recipe) return;
    const key = catalogRecipeKey(id);
    if (savedIds.has(key)) return;
    try {
      await db.recipes.put({
        id: key,
        user_id: userId,
        name: recipe.name,
        servings: recipe.servings,
        cooked_weight_g: null,
        ingredients: recipe.ingredients,
        notes: recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
        deleted: false,
        ...stamp(),
      });
      setNote(`„${recipe.name}” e la rețetele tale. O notezi din jurnal, la Rețete.`);
    } catch {
      setNote('Rețeta nu s-a putut salva pe dispozitiv.');
    }
  };

  return (
    <Panel title="Rețete gata" edge={D.edge}>
      <p className="text-[15px] text-steel/80">
        Rețete cunoscute. „Meniu” sunt variante de casă din meniul Tastemotions, doar felurile care se pot număra din alimentele aplicației. Nu sunt porțiile de catering și nu includ aluat, trufe, pancetta sau înghețată. Caloriile se adună din ingrediente.
      </p>
      <div className="mt-3">
        <Segmented<RecipeCuisine>
          label="Bucătărie"
          options={FILTERS}
          value={cuisine}
          onChange={setCuisine}
          activeClass={D.solid}
          columns={3}
        />
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {shown.map((recipe) => {
          const per = perServing(recipeTotals(recipe.ingredients), recipe.servings);
          const saved = savedIds.has(catalogRecipeKey(recipe.id));
          const open = openId === recipe.id;
          return (
            <li key={recipe.id} className="border-t border-steel/10 pt-3">
              <p className="font-semibold">{recipe.name}</p>
              <p className="text-sm text-steel/70">{recipe.summary}</p>
              <p className="mt-1 text-[15px]">
                {formatNum(per.kcal, 0)} kcal, {formatNum(per.protein, 0)} g proteine, {formatNum(per.fiber, 0)} g fibre,
                pe porție. {recipe.servings} {recipe.servings === 1 ? 'porție' : 'porții'}, circa {recipe.minutes} min.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn-quiet min-h-[44px] px-3"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : recipe.id)}
                >
                  {open ? 'Ascunde' : 'Ingrediente'}
                </button>
                <button
                  type="button"
                  className={`btn min-h-[44px] flex-1 ${saved ? 'border border-steel/30 bg-white text-steel' : D.solid}`}
                  disabled={saved}
                  onClick={() => void add(recipe.id)}
                >
                  {saved ? 'La rețetele tale' : 'Adaugă'}
                </button>
              </div>
              {open && (
                <div className="mt-2 text-[15px]">
                  <ul className="flex flex-col gap-1">
                    {recipe.ingredients.map((item) => (
                      <li key={`${item.name}-${item.grams}`}>
                        {item.name}, {formatNum(item.grams, 0)} g
                      </li>
                    ))}
                  </ul>
                  <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">
                    {recipe.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {note && (
        <div className="mt-3">
          <Notice tone="info">{note}</Notice>
        </div>
      )}
    </Panel>
  );
}
