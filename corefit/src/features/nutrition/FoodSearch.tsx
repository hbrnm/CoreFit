import { useMemo, useState } from 'react';
import { Barcode, Plus, Search } from 'lucide-react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { db, newId, stamp, type Per100 } from '../../lib/db';
import { DOMAIN } from '../../lib/domains';
import { builtinPool, customPool, type PickedFood } from '../../lib/foodMatch';
import { normalize } from '../../lib/ingredients';
import { formatNum, parseDecimal } from '../../lib/numbers';
import { fetchByBarcode, searchOff, type OffProduct } from '../../lib/off';
import { Notice } from '../../components/ui';
import { BarcodeScanner, canScanBarcodes } from './BarcodeScanner';

const D = DOMAIN.nutrition;

export type { PickedFood };

interface Props {
  onPick: (food: PickedFood) => void;
}

const EMPTY_FORM = { name: '', brand: '', barcode: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '', serving: '' };

export function FoodSearch({ onPick }: Props) {
  const { userId } = useApp();
  const { data: custom } = useLive(
    () =>
      db.customFoods
        .where('user_id')
        .equals(userId)
        .filter((f) => !f.deleted)
        .toArray(),
    [userId],
  );

  const [query, setQuery] = useState('');
  const [online, setOnline] = useState<OffProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const q = normalize(query.trim());

  const localMatches = useMemo<PickedFood[]>(() => {
    const all = [...customPool(custom ?? []), ...builtinPool()];
    if (q === '') return all.slice(0, 30);
    return all.filter((f) => normalize(`${f.name} ${f.brand}`).includes(q)).slice(0, 40);
  }, [custom, q]);

  /** Produsele găsite online se păstrează local, ca să meargă și fără internet la următoarea scanare. */
  const remember = async (p: OffProduct): Promise<void> => {
    if (p.barcode) {
      const existing = await db.customFoods.where('user_id').equals(userId).filter((f) => f.barcode === p.barcode && !f.deleted).first();
      if (existing) return;
    }
    await db.customFoods.put({
      id: newId(),
      user_id: userId,
      name: p.name,
      brand: p.brand,
      barcode: p.barcode || null,
      ...p.per100,
      serving_g: p.servingG,
      deleted: false,
      ...stamp(),
    });
  };

  const pickOff = (p: OffProduct) => {
    void remember(p);
    onPick({ name: p.name, brand: p.brand, per100: p.per100, servingG: p.servingG, source: 'off' });
  };

  const searchOnline = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const results = await searchOff(query);
      setOnline(results);
      if (results.length === 0) setMessage('Nimic găsit online pentru această căutare.');
    } catch {
      setMessage('Căutarea online nu a mers. Verifică internetul sau folosește lista locală.');
    } finally {
      setBusy(false);
    }
  };

  const lookupBarcode = async (code: string) => {
    const clean = code.replace(/\D/g, '');
    if (clean.length < 8) return setMessage('Codul de bare are cel puțin 8 cifre.');
    setBusy(true);
    setMessage(null);
    try {
      // întâi local, ca produsele scanate deja să meargă offline
      const saved = await db.customFoods.where('user_id').equals(userId).filter((f) => f.barcode === clean && !f.deleted).first();
      if (saved) {
        onPick({ name: saved.name, brand: saved.brand, per100: saved, servingG: saved.serving_g, source: 'custom' });
        return;
      }
      const product = await fetchByBarcode(clean);
      if (product) pickOff(product);
      else {
        setMessage('Produsul nu e în Open Food Facts sau nu are valori nutriționale. Îl poți adăuga manual.');
        setForm({ ...EMPTY_FORM, barcode: clean });
        setCreating(true);
      }
    } catch {
      setMessage('Nu am putut căuta produsul. Verifică internetul sau scrie valorile manual.');
    } finally {
      setBusy(false);
    }
  };

  const num = (s: string): number => parseDecimal(s) ?? 0;

  const saveCustom = async () => {
    const name = form.name.trim();
    const kcal = num(form.kcal);
    if (name.length < 2) return setMessage('Scrie numele alimentului.');
    if (kcal <= 0 || kcal > 950) return setMessage('Caloriile la 100 g trebuie să fie între 1 și 950.');
    const sodium = num(form.sodium);
    if (sodium < 0 || sodium > 40000) return setMessage('Sodiul la 100 g trebuie să fie între 0 și 40000 mg.');
    const per100: Per100 = {
      kcal100: kcal,
      protein100: num(form.protein),
      carbs100: num(form.carbs),
      fat100: num(form.fat),
      fiber100: num(form.fiber),
      sugar100: num(form.sugar),
      sodium100: Math.round(sodium),
    };
    const serving = parseDecimal(form.serving);
    await db.customFoods.put({
      id: newId(),
      user_id: userId,
      name,
      brand: form.brand.trim(),
      barcode: form.barcode.trim() || null,
      ...per100,
      serving_g: serving && serving > 0 ? serving : null,
      deleted: false,
      ...stamp(),
    });
    setCreating(false);
    setForm(EMPTY_FORM);
    onPick({ name, brand: form.brand.trim(), per100, servingG: serving && serving > 0 ? serving : null, source: 'custom' });
  };

  const field = (label: string, key: keyof typeof EMPTY_FORM, mode: 'text' | 'decimal' | 'numeric' = 'decimal') => (
    <div>
      <label className="label" htmlFor={`cf-${key}`}>
        {label}
      </label>
      <input
        id={`cf-${key}`}
        className="field"
        inputMode={mode}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  if (creating) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-steel/80">Valorile sunt la 100 g, cum apar pe etichetă.</p>
        {field('Nume', 'name', 'text')}
        {field('Marcă (opțional)', 'brand', 'text')}
        <div className="grid grid-cols-2 gap-3">
          {field('Calorii (kcal)', 'kcal')}
          {field('Proteine (g)', 'protein')}
          {field('Carbohidrați (g)', 'carbs')}
          {field('din care zaharuri (g)', 'sugar')}
          {field('Grăsimi (g)', 'fat')}
          {field('Fibre (g)', 'fiber')}
          {field('Sodiu (mg)', 'sodium')}
        </div>
        {field('Porție uzuală, în grame (opțional)', 'serving')}
        {field('Cod de bare (opțional)', 'barcode', 'numeric')}
        {message && <Notice tone="warn">{message}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-quiet" onClick={() => setCreating(false)}>
            Înapoi
          </button>
          <button type="button" className={`btn ${D.solid}`} onClick={() => void saveCustom()}>
            Salvează
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel/40" aria-hidden="true" />
        <input
          className="field pl-10"
          type="search"
          placeholder="Caută un aliment"
          aria-label="Caută un aliment"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOnline(null);
            setMessage(null);
          }}
        />
      </div>

      <div className="flex gap-2">
        <input
          className="field min-w-0 flex-1"
          inputMode="numeric"
          placeholder="Cod de bare"
          aria-label="Cod de bare"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
        <button type="button" className="btn-quiet shrink-0" onClick={() => void lookupBarcode(barcode)} disabled={busy}>
          Caută
        </button>
        {canScanBarcodes() && (
          <button type="button" className="btn-quiet shrink-0" onClick={() => setScanning(true)} aria-label="Scanează cu camera">
            <Barcode size={20} />
          </button>
        )}
      </div>

      {message && <Notice tone="warn">{message}</Notice>}

      <ul className="divide-y divide-steel/10 border-y border-steel/10 bg-white">
        {localMatches.map((f, i) => (
          <li key={`${f.source}-${f.name}-${i}`}>
            <button
              type="button"
              onClick={() => onPick(f)}
              className="flex min-h-[56px] w-full flex-col justify-center px-3 text-left active:bg-steel/5"
            >
              <span className="font-semibold">
                {f.name}
                {f.brand ? <span className="font-normal text-steel/60">, {f.brand}</span> : null}
              </span>
              <span className="text-sm text-steel/60">
                {formatNum(f.per100.kcal100, 0)} kcal la 100 g, proteine {formatNum(f.per100.protein100)} g
                {f.source === 'custom' ? ', aliment propriu' : ''}
              </span>
            </button>
          </li>
        ))}
        {localMatches.length === 0 && <li className="px-3 py-4 text-steel/70">Niciun aliment local găsit.</li>}
      </ul>

      {query.trim().length >= 2 && (
        <button type="button" className="btn-outline" onClick={() => void searchOnline()} disabled={busy}>
          {busy ? 'Se caută...' : 'Caută și în Open Food Facts'}
        </button>
      )}

      {online && online.length > 0 && (
        <ul className="divide-y divide-steel/10 border-y border-steel/10 bg-white">
          {online.map((p) => (
            <li key={p.barcode || p.name}>
              <button type="button" onClick={() => pickOff(p)} className="flex min-h-[56px] w-full flex-col justify-center px-3 text-left active:bg-steel/5">
                <span className="font-semibold">
                  {p.name}
                  {p.brand ? <span className="font-normal text-steel/60">, {p.brand}</span> : null}
                </span>
                <span className="text-sm text-steel/60">
                  {formatNum(p.per100.kcal100, 0)} kcal la 100 g, proteine {formatNum(p.per100.protein100)} g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn-outline" onClick={() => setCreating(true)}>
        <Plus size={18} />
        Aliment nou, propriu
      </button>

      <p className="text-xs text-steel/55">
        Lista locală are valori medii apropiate de USDA FoodData Central. Rezultatele online vin din Open Food Facts
        (date deschise, completate de utilizatori): verifică-le cu eticheta.
      </p>

      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onDetected={(code) => {
            setScanning(false);
            setBarcode(code);
            void lookupBarcode(code);
          }}
        />
      )}
    </div>
  );
}
