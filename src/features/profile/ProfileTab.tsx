import { useState, type ReactNode } from 'react';
import { ChevronRight, Database, LogIn } from 'lucide-react';
import { DataPanel } from './DataPanel';
import { SyncLine } from './SyncLine';
import { useApp } from '../../context';
import {
  saveProfilePatch,
  type ActivityLevel,
  type EffortScale,
  type LocalProfile,
  type LongTermFocus,
  type NutritionPhase,
  type Sex,
  type TrainingSplit,
  type WeekStartsOn,
} from '../../lib/db';
import { FOCUS_OPTIONS } from '../../lib/longTerm';
import { PHASE_LABELS, SPLIT_LABELS } from '../../lib/labels';
import { formatNum } from '../../lib/numbers';
import { ACTIVITY_LABELS } from '../../lib/nutrition';
import { parseBirthYear, parseHeight, parseKcalOverride, type Parsed } from '../../lib/profileFields';
import { supabase } from '../../lib/supabase';
import { applyThemePref, readThemePref, THEME_LABELS, type ThemePref } from '../../lib/theme';
import { Notice, RangePicker, Sheet } from '../../components/ui';

/*
 * Profilul, după design/round5/08: liste grupate ca în Setările iOS. Fiecare rând arată valoarea
 * și se schimbă într-un panou; schimbarea se salvează imediat, fără „Salvează” la final.
 */

const SEX_LABELS: Record<Sex, string> = { male: 'Bărbat', female: 'Femeie' };
const EFFORT_LABELS: Record<EffortScale, string> = { rir: 'RIR (repetări în rezervă)', rpe: 'RPE (1–10)' };
const WEEK_LABELS: Record<WeekStartsOn, string> = { monday: 'Luni', sunday: 'Duminică' };
const THEME_OPTIONS = (Object.keys(THEME_LABELS) as ThemePref[]).map((value) => ({ value, label: THEME_LABELS[value] }));

type Choice = { kind: 'choice'; title: string; options: ReadonlyArray<{ value: string; label: string }>; value: string | null; save: (v: string) => Promise<void> };
type NumberEdit = { kind: 'number'; title: string; unit?: string; hint?: string; value: string; parse: (t: string) => Parsed; save: (v: number | null) => Promise<void> };
type TextEdit = { kind: 'text'; title: string; value: string; save: (v: string) => Promise<void> };
type Editing = Choice | NumberEdit | TextEdit;

const entries = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export function ProfileTab() {
  const { userId, profile, cloud, email, sync, signOut } = useApp();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(readThemePref);

  if (!profile) return null;
  const patch = (p: Partial<LocalProfile>) => saveProfilePatch(userId, p);
  const choice = <T extends string>(title: string, labels: Record<T, string>, value: T | null, key: keyof LocalProfile): Choice => ({
    kind: 'choice',
    title,
    options: entries(labels),
    value,
    save: (v) => patch({ [key]: v as T }),
  });

  const focusLabels = Object.fromEntries(FOCUS_OPTIONS.map((o) => [o.id, o.label])) as Record<LongTermFocus, string>;

  const handleSignOut = async () => {
    const warning =
      sync.pending > 0
        ? `Ai ${sync.pending} modificări nesincronizate. Rămân pe acest dispozitiv și se trimit când te conectezi din nou. Te deconectezi?`
        : 'Te deconectezi? Datele rămân pe acest dispozitiv.';
    if (window.confirm(warning)) await signOut();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="pt-2">
        <h1 className="font-display text-[40px] font-extrabold leading-tight tracking-tight">Profil</h1>
        <SyncLine />
      </div>

      <Group title="Aspect">
        <div className="px-4 pb-4">
          <RangePicker<ThemePref>
            label="Aspect"
            options={THEME_OPTIONS}
            value={theme}
            onChange={(t) => {
              setTheme(t);
              applyThemePref(t);
            }}
          />
          <p className="mt-2 text-sm text-subtle">
            {theme === 'system' ? 'Urmează setarea telefonului.' : 'Doar pe acest dispozitiv.'}
          </p>
        </div>
      </Group>

      <Group title="Date personale">
        <Row label="Nume" value={profile.full_name || '–'} onClick={() => setEditing({ kind: 'text', title: 'Nume', value: profile.full_name, save: (v) => patch({ full_name: v.trim() }) })} />
        <Row label="Sex" value={profile.sex ? SEX_LABELS[profile.sex] : '–'} onClick={() => setEditing(choice<Sex>('Sex', SEX_LABELS, profile.sex, 'sex'))} />
        <Row
          label="An naștere"
          value={profile.birth_year ? String(profile.birth_year) : '–'}
          onClick={() =>
            setEditing({ kind: 'number', title: 'An naștere', value: profile.birth_year ? String(profile.birth_year) : '', parse: (t) => parseBirthYear(t), save: (v) => patch({ birth_year: v }) })
          }
        />
        <Row
          label="Înălțime"
          value={profile.height_cm ? `${formatNum(profile.height_cm)} cm` : '–'}
          onClick={() =>
            setEditing({ kind: 'number', title: 'Înălțime', unit: 'cm', value: profile.height_cm ? formatNum(profile.height_cm) : '', parse: parseHeight, save: (v) => patch({ height_cm: v }) })
          }
        />
        <Row label="Activitate" value={ACTIVITY_LABELS[profile.activity_level]} onClick={() => setEditing(choice<ActivityLevel>('Nivel de activitate', ACTIVITY_LABELS, profile.activity_level, 'activity_level'))} />
      </Group>

      <Group title="Antrenament și nutriție">
        <Row label="Program" value={SPLIT_LABELS[profile.training_split]} onClick={() => setEditing(choice<TrainingSplit>('Program de antrenament', SPLIT_LABELS, profile.training_split, 'training_split'))} />
        <Row label="Faza" value={PHASE_LABELS[profile.nutrition_phase]} onClick={() => setEditing(choice<NutritionPhase>('Faza nutrițională', PHASE_LABELS, profile.nutrition_phase, 'nutrition_phase'))} />
        <Row
          label="Țintă manuală"
          value={profile.kcal_target_override ? `${formatNum(profile.kcal_target_override, 0)} kcal` : 'Calculată'}
          onClick={() =>
            setEditing({
              kind: 'number',
              title: 'Țintă manuală de calorii',
              unit: 'kcal',
              hint: 'Gol înseamnă ținta calculată din profil și greutate.',
              value: profile.kcal_target_override ? String(profile.kcal_target_override) : '',
              parse: parseKcalOverride,
              save: (v) => patch({ kcal_target_override: v }),
            })
          }
        />
        <Row label="Scală de efort" value={profile.effort_scale === 'rpe' ? 'RPE' : 'RIR'} onClick={() => setEditing(choice<EffortScale>('Scală de efort', EFFORT_LABELS, profile.effort_scale === 'rpe' ? 'rpe' : 'rir', 'effort_scale'))} />
        <Row label="Săptămâna începe" value={WEEK_LABELS[profile.week_starts_on === 'sunday' ? 'sunday' : 'monday']} onClick={() => setEditing(choice<WeekStartsOn>('Săptămâna începe', WEEK_LABELS, profile.week_starts_on === 'sunday' ? 'sunday' : 'monday', 'week_starts_on'))} />
        <Row label="Obiectiv pe termen lung" value={profile.long_term_focus ? focusLabels[profile.long_term_focus] : '–'} onClick={() => setEditing(choice<LongTermFocus>('Obiectiv pe termen lung', focusLabels, profile.long_term_focus, 'long_term_focus'))} />
      </Group>

      <Group title="Date și cont">
        <Row label="Copie, import, ștergere" icon={<Database size={18} aria-hidden="true" />} onClick={() => setDataOpen(true)} />
        {cloud ? (
          <button type="button" className="min-h-[52px] w-full border-t border-line px-4 text-left text-[17px] font-semibold" onClick={() => void handleSignOut()}>
            Deconectare{email ? <span className="block text-sm font-normal text-subtle">{email}</span> : null}
          </button>
        ) : (
          supabase && (
            <Row
              label="Conectează un cont"
              value="ca să sincronizezi"
              icon={<LogIn size={18} aria-hidden="true" />}
              onClick={() => {
                if (window.confirm('Te duc la conectare. Datele din modul local rămân pe acest telefon și nu se mută în cont. Continui?')) void signOut();
              }}
            />
          )
        )}
      </Group>

      {editing && <EditSheet editing={editing} onClose={() => setEditing(null)} />}
      {dataOpen && (
        <Sheet title="Datele tale" onClose={() => setDataOpen(false)}>
          <DataPanel />
        </Sheet>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel overflow-hidden" aria-label={title}>
      <h2 className="px-4 pb-2 pt-3.5 text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, icon, onClick }: { label: string; value?: string; icon?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="flex min-h-[52px] w-full items-center gap-3 border-t border-line px-4 text-left" onClick={onClick}>
      <span className="flex-1 text-[17px]">{label}</span>
      {value && <span className="max-w-[55%] truncate text-right text-[17px] text-muted">{value}</span>}
      {icon ? <span className="text-muted">{icon}</span> : <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden="true" />}
    </button>
  );
}

function EditSheet({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const [text, setText] = useState(editing.kind === 'choice' ? '' : editing.value);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      if (editing.kind === 'text') await editing.save(text);
      else if (editing.kind === 'number') {
        const r = editing.parse(text);
        if (r.error !== undefined) return setError(r.error);
        await editing.save(r.value);
      }
      onClose();
    } catch {
      setError('Nu s-a putut salva pe dispozitiv.');
    }
  };

  return (
    <Sheet title={editing.title} onClose={onClose}>
      {editing.kind === 'choice' ? (
        <div role="radiogroup" aria-label={editing.title} className="flex flex-col">
          {editing.options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={editing.value === o.value}
              className="flex min-h-[52px] items-center justify-between border-b border-line text-left text-[17px] last:border-b-0"
              onClick={() => void editing.save(o.value).then(onClose)}
            >
              {o.label}
              {editing.value === o.value && <span className="font-semibold text-brand-fg">✓</span>}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div>
            <label htmlFor="profile-field" className="label">
              {editing.title}
              {editing.kind === 'number' && editing.unit ? ` (${editing.unit})` : ''}
            </label>
            <input
              id="profile-field"
              className="field"
              autoFocus
              inputMode={editing.kind === 'number' ? 'decimal' : undefined}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
            />
            {editing.kind === 'number' && editing.hint && <p className="mt-1 text-sm text-subtle">{editing.hint}</p>}
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className="btn-primary min-h-[52px]">
            Gata
          </button>
        </form>
      )}
    </Sheet>
  );
}
