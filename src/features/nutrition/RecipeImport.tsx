import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Link2, Trash2 } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, type Per100 } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { builtinPool, customPool, matchFoods, CONFIDENT, type PickedFood } from '../../lib/foodMatch';
import { formatNum, parseDecimal, toFieldString } from '../../lib/numbers';
import {
  extractRecipeFromHtml,
  parseRecipeText,
  toGrams,
  type ParsedLine,
  type ParsedRecipe,
} from '../../lib/recipeImport';
import { Notice, Segmented, Sheet, Stepper } from '../../components/ui';
import { FoodSearch } from './FoodSearch';

const D = DOMAIN.nutrition;

export interface RecipeDraft {
  name: string;
  servings: number;
  ingredients: Array<{ name: string; grams: number } & Per100>;
}

interface Row {
  key: string;
  line: ParsedLine;
  name: string;
  food: PickedFood | null;
  grams: string;
  include: boolean;
  confident: boolean;
}

function buildRows(parsed: ParsedRecipe, pool: PickedFood[]): Row[] {
  return parsed.lines.map((line, i) => {
    const candidates = matchFoods(line.name, pool);
    const best = candidates[0];
    const food = best ? best.food : null;
    const g = toGrams(line, food ? { foodId: food.foodId, servingG: food.servingG } : null);
    return {
      key: `${i}-${line.raw}`,
      line,
      name: line.name || line.raw,
      food,
      grams: g !== null ? toFieldString(g) : '',
      include: true,
      confident: best ? best.score >= CONFIDENT : false,
    };
  });
}

type Mode = 'link' | 'text';
type Stage = 'input' | 'review';

interface Props {
  onClose: () => void;
  onImported: (draft: RecipeDraft) => void;
}

export function RecipeImport({ onClose, onImported }: Props) {
  const { userId } = useApp();
  const { data: customFoods } = useLive(
    () =>
      db.customFoods
        .where('user_id')
        .equals(userId)
        .filter((f) => !f.deleted)
        .toArray(),
    [userId],
  );
  const pool = useMemo(() => [...customPool(customFoods ?? []), ...builtinPool()], [customFoods]);

  const [mode, setMode] = useState<Mode>('link');
  const [stage, setStage] = useState<Stage>('input');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [servings, setServings] = useState('2');
  const [rows, setRows] = useState<Row[]>([]);
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  const startReview = (parsed: ParsedRecipe) => {
    setName(parsed.name || 'Rețetă importată');
    setServings(parsed.servings ? String(parsed.servings) : '2');
    setRows(buildRows(parsed, pool));
    setStage('review');
  };

  const fromText = () => {
    if (text.trim().length < 3) return setError('Lipește textul rețetei.');
    const parsed = parseRecipeText(text);
    if (parsed.lines.length === 0) {
      return setError('Nu am găsit ingrediente în text. Verifică să fie câte unul pe rând, cu cantitate.');
    }
    setError(null);
    startReview(parsed);
  };

  const fromLink = async () => {
    const raw = url.trim();
    if (raw === '') return setError('Scrie adresa paginii cu rețeta.');
    const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setBusy(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      let html: string;
      try {
        const res = await fetch(target, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        html = await res.text();
      } finally {
        window.clearTimeout(timeout);
      }
      const parsed = extractRecipeFromHtml(html);
      if (!parsed) {
        setError(
          'Nu am găsit o rețetă structurată pe această pagină. Copiază titlul și lista de ingrediente și lipește-le la fila „Text”.',
        );
        return;
      }
      if (parsed.lines.length === 0) {
        setError('Pagina are o rețetă, dar fără ingrediente pe care să le pot citi. Încearcă fila „Text”.');
        return;
      }
      startReview(parsed);
    } catch {
      setError(
        'Nu am putut citi pagina de aici (multe site-uri blochează accesul direct din aplicație). Copiază titlul și ingredientele și lipește-le la fila „Text”.',
      );
    } finally {
      setBusy(false);
    }
  };

  const patchRow = (key: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const applyFood = (key: string, food: PickedFood) => {
    setPickingFor(null);
    patchRow(key, (() => {
      const row = rows.find((r) => r.key === key);
      const g = row ? toGrams(row.line, { foodId: food.foodId, servingG: food.servingG }) : null;
      return { food, confident: true, grams: g !== null ? toFieldString(g) : row?.grams || '' };
    })());
  };

  const included = rows.filter((r) => r.include);
  const needsAttention = included.filter((r) => !r.food || !r.confident || parseDecimal(r.grams) === null || (parseDecimal(r.grams) ?? 0) <= 0);

  const confirm = () => {
    const n = parseDecimal(servings);
    if (name.trim().length < 2) return setError('Dă un nume rețetei.');
    if (n === null || n <= 0 || n > 100) return setError('Numărul de porții trebuie să fie între 1 și 100.');
    if (included.length === 0) return setError('Bifează cel puțin un ingredient.');

    const ingredients: RecipeDraft['ingredients'] = [];
    for (const r of included) {
      const g = parseDecimal(r.grams);
      if (!r.food || g === null || g <= 0) {
        return setError(`Completează alimentul și cantitatea pentru „${r.name}”, sau debifează rândul.`);
      }
      ingredients.push({ name: r.name.trim() || r.food.name, grams: g, ...r.food.per100 });
    }
    setError(null);
    onImported({ name: name.trim(), servings: n, ingredients });
  };

  if (stage === 'input') {
    return (
      <Sheet title="Importă o rețetă" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <Segmented<Mode>
            label="Sursa"
            options={[
              { value: 'link', label: 'Link' },
              { value: 'text', label: 'Text' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            activeClass={D.solid}
          />

          {mode === 'link' ? (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-fg">
                Funcționează pentru paginile care descriu rețeta în format standard (majoritatea site-urilor mari de
                rețete). Multe site-uri blochează însă accesul direct dintr-o aplicație; dacă nu merge, folosește
                fila „Text”.
              </p>
              <div>
                <label htmlFor="recipe-url" className="label">
                  Adresa paginii
                </label>
                <div className="flex gap-2">
                  <input
                    id="recipe-url"
                    className="field min-w-0 flex-1"
                    inputMode="url"
                    placeholder="exemplu.ro/reteta-de-..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button type="button" className={`btn shrink-0 ${D.solid}`} onClick={() => void fromLink()} disabled={busy}>
                    <Link2 size={18} />
                    {busy ? 'Se citește...' : 'Importă'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-fg">
                Lipește titlul și lista de ingrediente (unul pe rând, cu cantitate). Restul textului, cum e modul de
                preparare, e ignorat automat dacă are un antet ca „Mod de preparare”.
              </p>
              <textarea
                rows={10}
                className="field py-2"
                placeholder={'Ciorbă de legume\nPorții: 4\nIngrediente\n2 morcovi\n1 ceapă\n300 g cartofi\n...'}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="button" className={`btn ${D.solid}`} onClick={fromText}>
                Interpretează textul
              </button>
            </div>
          )}

          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Verifică rețeta importată" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="import-name" className="label">
            Nume
          </label>
          <input id="import-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <Stepper label="Câte porții iese" value={servings} onChange={setServings} step={1} min={1} max={100} />

        {needsAttention.length > 0 ? (
          <Notice tone="warn">
            {needsAttention.length} din {included.length} ingrediente au nevoie de verificare: aliment nepotrivit sau
            cantitate lipsă.
          </Notice>
        ) : (
          <Notice tone="ok">Toate ingredientele au fost potrivite. Verifică-le și continuă.</Notice>
        )}

        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const attention = !r.food || !r.confident || parseDecimal(r.grams) === null || (parseDecimal(r.grams) ?? 0) <= 0;
            return (
              <li key={r.key} className={`panel p-3 ${!r.include ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-pressed={r.include}
                    aria-label={r.include ? 'Exclude ingredientul' : 'Include ingredientul'}
                    onClick={() => patchRow(r.key, { include: !r.include })}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${r.include ? 'bg-brand text-on-brand' : 'border border-line-strong'}`}
                  >
                    {r.include && <Check size={16} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-subtle">{r.line.raw}</p>
                    <input
                      className="field mt-1 px-2 py-1.5"
                      value={r.name}
                      onChange={(e) => patchRow(r.key, { name: e.target.value })}
                      aria-label="Numele ingredientului"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      {attention && r.include && <AlertTriangle size={16} className="shrink-0 text-warning" aria-hidden="true" />}
                      <button
                        type="button"
                        className="min-h-[36px] truncate text-left text-sm font-semibold text-brand-fg underline-offset-2 active:underline"
                        onClick={() => setPickingFor(r.key)}
                      >
                        {r.food ? `${r.food.name}${r.food.brand ? `, ${r.food.brand}` : ''}` : 'Alege alimentul'}
                      </button>
                    </div>
                    {r.food && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          className="field w-24 px-2 text-center"
                          inputMode="decimal"
                          value={r.grams}
                          onChange={(e) => patchRow(r.key, { grams: e.target.value })}
                          aria-label={`Grame, ${r.name}`}
                        />
                        <span className="text-sm text-muted">
                          g, {formatNum(((parseDecimal(r.grams) ?? 0) * r.food.per100.kcal100) / 100, 0)} kcal
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Șterge ${r.name}`}
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center text-subtle active:text-danger"
                    onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-quiet" onClick={() => setStage('input')}>
            Înapoi
          </button>
          <button type="button" className={`btn ${D.solid}`} onClick={confirm}>
            Continuă
          </button>
        </div>
      </div>

      {pickingFor && (
        <Sheet title="Alege alimentul" onClose={() => setPickingFor(null)}>
          <FoodSearch onPick={(food) => applyFood(pickingFor, food)} />
        </Sheet>
      )}
    </Sheet>
  );
}
