import { useEffect, useState } from 'react';
import { DataPanel } from './DataPanel';
import { ThemePanel } from './ThemePanel';
import { SyncLine } from './SyncLine';
import { useApp } from '../../context';
import {
  db,
  stamp,
  type ActivityLevel,
  type EffortScale,
  type LongTermFocus,
  type NutritionPhase,
  type Sex,
  type TrainingSplit,
  type WeekStartsOn,
} from '../../lib/db';
import { FOCUS_OPTIONS } from '../../lib/longTerm';
import { PHASE_LABELS, SPLIT_LABELS } from '../../lib/labels';
import { parseDecimal } from '../../lib/numbers';
import { ACTIVITY_LABELS } from '../../lib/nutrition';
import { Notice, Panel, Segmented } from '../../components/ui';

const SPLIT_OPTIONS = (Object.keys(SPLIT_LABELS) as TrainingSplit[]).map((value) => ({ value, label: SPLIT_LABELS[value] }));
const PHASE_OPTIONS = (Object.keys(PHASE_LABELS) as NutritionPhase[]).map((value) => ({ value, label: PHASE_LABELS[value] }));
const ACTIVITY_OPTIONS = Object.keys(ACTIVITY_LABELS) as ActivityLevel[];

export function ProfileTab() {
  const { profile, cloud, sync, signOut } = useApp();

  const [fullName, setFullName] = useState('');
  const [split, setSplit] = useState<TrainingSplit>('upper_lower');
  const [phase, setPhase] = useState<NutritionPhase>('maintenance');
  const [sex, setSex] = useState<Sex | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [kcalOverride, setKcalOverride] = useState('');
  const [focus, setFocus] = useState<LongTermFocus | null>(null);
  const [also, setAlso] = useState<LongTermFocus[]>([]);
  const [effortScale, setEffortScale] = useState<EffortScale>('rir');
  const [weekStarts, setWeekStarts] = useState<WeekStartsOn>('monday');
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'wizard' | 'data'>('wizard');
  const [step, setStep] = useState(1);

  // Completăm formularul o singură dată
  useEffect(() => {
    if (!profile || hydrated) return;
    setFullName(profile.full_name);
    setSplit(profile.training_split);
    setPhase(profile.nutrition_phase);
    setSex(profile.sex);
    setBirthYear(profile.birth_year !== null ? String(profile.birth_year) : '');
    setHeight(profile.height_cm !== null ? String(profile.height_cm).replace('.', ',') : '');
    setActivity(profile.activity_level);
    setKcalOverride(profile.kcal_target_override !== null ? String(profile.kcal_target_override) : '');
    setFocus(profile.long_term_focus ?? null);
    setAlso(profile.long_term_also ?? []);
    setEffortScale(profile.effort_scale === 'rpe' ? 'rpe' : 'rir');
    setWeekStarts(profile.week_starts_on === 'sunday' ? 'sunday' : 'monday');
    setHydrated(true);
  }, [profile, hydrated]);

  const touched = <T,>(setter: (value: T) => void) => (value: T) => {
    setSaved(false);
    setter(value);
  };

  const save = async () => {
    if (!profile) return;

    const year = birthYear.trim() === '' ? null : parseDecimal(birthYear);
    if (year !== null && (!Number.isInteger(year) || year < 1920 || year > new Date().getFullYear() - 10)) {
      return setError('Anul nașterii nu este valid.');
    }
    const h = height.trim() === '' ? null : parseDecimal(height);
    if (h !== null && (h < 100 || h > 250)) return setError('Înălțimea trebuie să fie între 100 și 250 cm.');
    const kcal = kcalOverride.trim() === '' ? null : parseDecimal(kcalOverride);
    if (kcal !== null && (!Number.isInteger(kcal) || kcal < 800 || kcal > 8000)) {
      return setError('Ținta manuală de calorii trebuie să fie între 800 și 8000.');
    }

    try {
      await db.profiles.put({
        ...profile,
        full_name: fullName.trim(),
        training_split: split,
        nutrition_phase: phase,
        sex,
        birth_year: year,
        height_cm: h,
        activity_level: activity,
        kcal_target_override: kcal,
        long_term_focus: focus,
        long_term_also: also.filter((id) => id !== focus),
        effort_scale: effortScale,
        week_starts_on: weekStarts,
        ...stamp(),
      });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Profilul nu s-a putut salva pe dispozitiv.');
    }
  };

  const handleSignOut = async () => {
    const warning =
      sync.pending > 0
        ? `Ai ${sync.pending} modificări nesincronizate. Rămân pe acest dispozitiv și se trimit când te conectezi din nou. Te deconectezi?`
        : 'Te deconectezi? Datele rămân pe acest dispozitiv.';
    if (window.confirm(warning)) await signOut();
  };

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">Profil</h1>
        <div className="flex items-center gap-2">
          {cloud && (
            <button type="button" onClick={() => void handleSignOut()} className="text-xs font-semibold text-subtle hover:text-fg mr-2">
              Deconectare
            </button>
          )}
          <div className="flex rounded-lg bg-raised p-1">
          <button 
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${view === 'wizard' ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
            onClick={() => setView('wizard')}
          >
            Setări
          </button>
          <button
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${view === 'data' ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
            onClick={() => setView('data')}
          >
            Date
          </button>
        </div>
        </div>
      </div>
      <div className="-mt-4">
        <SyncLine />
      </div>

      <ThemePanel />

      {view === 'data' ? (
        <DataPanel />
      ) : (
        <Panel className="relative overflow-hidden">
          {/* Progress Bar Top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-fg/10">
             <div className="h-full bg-brand transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>

          <div className="mt-2 mb-6 text-center">
             <h2 className="text-brand-fg uppercase tracking-wider text-sm font-bold">Pasul {step} din 4</h2>
             <p className="text-muted text-sm mt-1">
               {step === 1 && 'Date personale'}
               {step === 2 && 'Nutriție & Activitate'}
               {step === 3 && 'Antrenament & Efort'}
               {step === 4 && 'Obiective pe termen lung'}
             </p>
          </div>

          <div className="flex flex-col gap-5">
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-4">
                <div>
                  <label className="label">Nume complet</label>
                  <input className="field" value={fullName} onChange={(e) => touched(setFullName)(e.target.value)} placeholder="Ex: Alex" />
                </div>
                <div>
                  <label className="label">Sex</label>
                  <Segmented<Sex> label="Sex" options={[{ value: 'male', label: 'Bărbat' }, { value: 'female', label: 'Femeie' }]} value={sex} onChange={touched(setSex)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">An naștere</label>
                    <input className="field" inputMode="numeric" value={birthYear} onChange={(e) => touched(setBirthYear)(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Înălțime (cm)</label>
                    <input className="field" inputMode="decimal" value={height} onChange={(e) => touched(setHeight)(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-4">
                <div>
                  <label className="label">Faza nutrițională</label>
                  <Segmented<NutritionPhase> label="Faza nutrițională" options={PHASE_OPTIONS} value={phase} onChange={touched(setPhase)} />
                  <p className="mt-1 text-xs text-subtle">Definirea scade ținta, masa musculară o crește.</p>
                </div>
                <div>
                  <label className="label">Nivel de activitate</label>
                  <select className="field" value={activity} onChange={(e) => touched(setActivity)(e.target.value as ActivityLevel)}>
                    {ACTIVITY_OPTIONS.map((a) => (
                      <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Țintă manuală Kcal (Opțional)</label>
                  <input className="field" inputMode="numeric" value={kcalOverride} onChange={(e) => touched(setKcalOverride)(e.target.value)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-4">
                <div>
                  <label className="label">Program de antrenament</label>
                  <Segmented<TrainingSplit> label="Program de antrenament" options={SPLIT_OPTIONS} value={split} onChange={touched(setSplit)} />
                </div>
                <div>
                  <label className="label">Săptămâna începe lunea?</label>
                  <Segmented<WeekStartsOn> label="Săptămâna începe lunea?" options={[{ value: 'monday', label: 'Luni' }, { value: 'sunday', label: 'Duminică' }]} value={weekStarts} onChange={touched(setWeekStarts)} />
                </div>
                <div>
                  <label className="label">Scală de Efort (RIR vs RPE)</label>
                  <Segmented<EffortScale> label="Scală de Efort" options={[{ value: 'rir', label: 'RIR (Repetări în rezervă)' }, { value: 'rpe', label: 'RPE (Percepție 1-10)' }]} value={effortScale} onChange={touched(setEffortScale)} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-4">
                <div>
                  <label className="label">Focus Principal</label>
                  <div className="grid gap-2 mt-2">
                    {FOCUS_OPTIONS.map((opt) => (
                      <button key={opt.id} className={`p-3 rounded-xl border text-left text-sm transition-all ${focus === opt.id ? 'border-brand bg-brand/10 font-semibold text-fg' : 'border-line bg-raised text-muted'}`} onClick={() => touched(setFocus)(opt.id)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {error && <Notice tone="error">{error}</Notice>}
            {saved && <Notice tone="ok">Profil salvat cu succes!</Notice>}

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-line">
               {step > 1 ? (
                 <button className="btn-quiet text-muted px-4" onClick={prevStep}>Înapoi</button>
               ) : <div />}
               
               {step < 4 ? (
                 <button className="btn-primary px-6 h-11" onClick={nextStep}>Următorul</button>
               ) : (
                 <button className="btn-primary px-8 h-11" onClick={() => void save()}>Finalizează</button>
               )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
