import { useEffect, useState } from 'react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { addDays, formatDayMonth } from '../../lib/date';
import { DOMAIN, PLATE } from '../../lib/domains';
import { formatNum, parseDecimal, toFieldString } from '../../lib/numbers';
import {
  ACTIVITY_LABELS,
  computeTargets,
  estimateExpenditure,
  PHASE_ADJUSTMENT,
  PROTEIN_G_PER_KG,
  weightTrend,
} from '../../lib/nutrition';
import { intakeByDate, upsertDay } from '../../lib/nutritionOps';
import { PHASE_LABELS } from '../../lib/labels';
import { LineChart } from '../../components/charts';
import { Notice, Panel, Stepper } from '../../components/ui';

const D = DOMAIN.nutrition;

export function ProgressPanel() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();

  const { data: logs } = useLive(() => db.nutritionLogs.where('user_id').equals(userId).toArray(), [userId]);
  const { data: intake } = useLive(() => intakeByDate(userId, addDays(today, -27), today), [userId, today]);

  const todayRow = (logs ?? []).find((l) => l.log_date === today);
  const [weight, setWeight] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // completăm o singură dată, din ce e deja notat azi sau din ultima greutate
  useEffect(() => {
    if (hydrated || !logs) return;
    const latest = [...logs].filter((l) => l.body_weight_kg !== null).sort((a, b) => b.log_date.localeCompare(a.log_date))[0];
    const start = todayRow?.body_weight_kg ?? latest?.body_weight_kg ?? null;
    setWeight(start !== null ? toFieldString(start) : '');
    setHydrated(true);
  }, [logs, hydrated, todayRow]);

  const trend = weightTrend(logs ?? []);
  const latestKg = trend.length > 0 ? trend[trend.length - 1].kg : null;
  const targets = computeTargets(profile, latestKg, new Date().getFullYear());
  const estimate = intake ? estimateExpenditure(trend, intake, today) : null;

  const kcalPoints = [...(intake ?? new Map<string, number>()).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, y]) => ({ label: formatDayMonth(date), y: Math.round(y) }));

  const saveWeight = async () => {
    const w = parseDecimal(weight);
    if (w === null || w < 20 || w > 400) return setError('Greutatea trebuie să fie între 20 și 400 kg.');
    try {
      await upsertDay(userId, today, { body_weight_kg: w });
      setError(null);
      setSaved(true);
    } catch {
      setError('Greutatea nu s-a putut salva pe dispozitiv.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Greutatea de azi" edge={D.edge}>
        <div className="flex flex-col gap-3">
          <Stepper
            label="Greutate corporală (kg)"
            value={weight}
            onChange={(v) => {
              setWeight(v);
              setSaved(false);
            }}
            step={0.1}
          />
          {error && <Notice tone="error">{error}</Notice>}
          {saved && <Notice tone="ok">Greutate salvată.</Notice>}
          <button type="button" className={`btn ${D.solid}`} onClick={() => void saveWeight()}>
            Salvează
          </button>
          <p className="text-sm text-steel/60">Cântărește-te dimineața, în condiții asemănătoare. O singură zi spune puțin; contează trendul.</p>
        </div>
      </Panel>

      <Panel title="Trendul greutății">
        {trend.length === 0 ? (
          <p className="text-steel/70">Notează greutatea câteva zile ca să apară trendul.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <LineChart
              points={trend.map((p) => ({ label: formatDayMonth(p.date), y: Math.round(p.trend * 10) / 10 }))}
              secondary={trend.map((p) => ({ label: formatDayMonth(p.date), y: p.kg }))}
              color={PLATE.green}
              unit="kg"
            />
            <p className="text-sm text-steel/60">Linia groasă e trendul (medie mobilă exponențială); linia subțire e greutatea zilnică.</p>
          </div>
        )}
      </Panel>

      <Panel title="Țintele tale">
        {targets ? (
          <div className="flex flex-col gap-3 text-[15px]">
            {targets.bmrKcal !== null && profile?.sex && profile.height_cm && profile.birth_year && latestKg !== null && (
              <div>
                <p>
                  <span className="num text-3xl">{formatNum(targets.bmrKcal, 0)}</span> kcal metabolism bazal
                </p>
                <p className="mt-1 text-steel/70">
                  Mifflin-St Jeor, fără activitate: 10×{formatNum(latestKg)} + 6,25×{formatNum(profile.height_cm)} − 5×
                  {new Date().getFullYear() - profile.birth_year} {profile.sex === 'male' ? '+ 5' : '− 161'}. Estimare, nu o
                  măsurătoare.
                </p>
              </div>
            )}
            {targets.bmrKcal === null && (
              <p className="text-steel/70">Metabolismul bazal are nevoie de sex, an de naștere, înălțime și o greutate notată mai sus.</p>
            )}
            <p>
              <span className="num text-3xl">{formatNum(targets.kcal, 0)}</span> kcal pe zi
              {targets.manual ? ' (țintă setată manual)' : `, faza ${PHASE_LABELS[profile?.nutrition_phase ?? 'maintenance'].toLowerCase()}`}
            </p>
            <p>
              Proteine {targets.protein} g, carbohidrați {targets.carbs} g, grăsimi {targets.fat} g.
            </p>
            {targets.maintenanceKcal && (
              <p className="text-steel/70">
                Cu activitatea aleasă, întreținerea este {formatNum(targets.maintenanceKcal, 0)} kcal. Bazalul nu include mersul, antrenamentul sau digestia.
                {PHASE_ADJUSTMENT[profile?.nutrition_phase ?? 'maintenance'] !== 0
                  ? ` Ținta aplică ${formatNum(PHASE_ADJUSTMENT[profile?.nutrition_phase ?? 'maintenance'] * 100, 0)}% față de întreținere.`
                  : ''}
              </p>
            )}
            <p className="text-sm text-steel/60">
              Proteina folosește {PROTEIN_G_PER_KG} g pe kg de greutate: o meta-analiză (Morton și colab., 2018) a găsit că
              beneficiul pentru masa musculară nu mai crește semnificativ peste aproximativ 1,6 g/kg/zi. Grăsimile sunt
              25% din calorii. Sunt puncte de plecare, nu prescripții.
            </p>
            {profile && (
              <p className="text-sm text-steel/60">
                Activitate: {ACTIVITY_LABELS[profile.activity_level]}.
              </p>
            )}
          </div>
        ) : (
          <Notice
            tone="info"
            title="Ținte incomplete"
            action={
              <button type="button" className="btn-outline" onClick={() => goTo('profile')}>
                Completează profilul
              </button>
            }
          >
            Am nevoie de sex, an de naștere, înălțime, nivel de activitate și o greutate notată aici. Poți alege și o
            țintă manuală de calorii.
          </Notice>
        )}
      </Panel>

      <Panel title="Consumul estimat din datele tale">
        {estimate ? (
          <div className="flex flex-col gap-2 text-[15px]">
            <p>
              <span className="num text-3xl">{formatNum(estimate.kcal, 0)}</span> kcal pe zi
            </p>
            <p className="text-steel/70">
              Calculat din caloriile notate în {estimate.intakeDays} de zile și din cât s-a mișcat trendul greutății în
              ultimele {estimate.windowDays} de zile (aproximativ 7700 kcal pe kg).
            </p>
            <p className="text-sm text-steel/60">
              Estimarea e mai bună cu cât notezi mai complet ce mănânci. Dacă uiți mese, consumul apare mai mic decât
              e în realitate.
            </p>
          </div>
        ) : (
          <p className="text-[15px] text-steel/70">
            Apare după cel puțin 10 zile cu mâncare notată și greutăți la începutul și la finalul unui interval de
            minimum 10 zile.
          </p>
        )}
      </Panel>

      {kcalPoints.length > 1 && (
        <Panel title="Calorii pe zi, ultimele 4 săptămâni">
          <LineChart points={kcalPoints} color={PLATE.green} unit="kcal" />
        </Panel>
      )}
    </div>
  );
}
