import { useEffect, useState } from 'react';
import { useApp } from '../../context';
import { useLive } from '../../hooks/useLive';
import { useToday } from '../../hooks/useToday';
import { db } from '../../lib/db';
import { addDays, formatDayMonth } from '../../lib/date';
import { formatNum, parseDecimal, plural, toFieldString } from '../../lib/numbers';
import { rangeDays, rangeFrom, RANGES, rateText, type Range } from '../../lib/progress';
import { sevenDayAverage, weeklyRate } from '../../lib/weight';
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
import { ProgressChart } from '../../components/ProgressChart';
import { Notice, Panel, RangePicker, Stepper } from '../../components/ui';

export function ProgressPanel() {
  const { userId, profile, goTo } = useApp();
  const today = useToday();

  const { data: logs } = useLive(() => db.nutritionLogs.where('user_id').equals(userId).toArray(), [userId]);
  const [range, setRange] = useState<Range>('30z');
  // cel puțin 28 de zile: consumul estimat are nevoie de ele, oricare ar fi intervalul afișat
  const intakeFrom = rangeDays(range) >= 28 ? rangeFrom(today, range) : addDays(today, -27);
  const { data: intake } = useLive(() => intakeByDate(userId, intakeFrom, today), [userId, intakeFrom, today]);

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

  const from = rangeFrom(today, range);
  const shown = trend.filter((p) => p.date >= from && p.date <= today);
  const lastPoint = shown[shown.length - 1] ?? null;
  const rate = weeklyRate(trend, today, Math.max(14, rangeDays(range)));
  const avg7 = sevenDayAverage(trend, today);
  const kcalSeries = [...(intake ?? new Map<string, number>()).entries()]
    .filter(([date, kcal]) => date >= from && kcal > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Math.round(value) }));

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
      <section aria-label="Greutate">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-body">Greutate</h2>
        <div className="mt-3">
          <RangePicker<Range> label="Interval" options={RANGES} value={range} onChange={setRange} />
        </div>
        {lastPoint ? (
          <>
            <p className="num mt-4 text-[64px] leading-none tracking-tight">
              {formatNum(lastPoint.trend)}
              <span className="ml-1 text-[22px] font-semibold tracking-normal text-subtle">kg</span>
            </p>
            <p className="mt-2 text-[17px] leading-snug text-muted">
              Trendul{rate !== null ? `: ${rateText(rate)}` : ''}
              {avg7 !== null ? ` · media pe 7 zile ${formatNum(avg7)} kg` : ''}
            </p>
            <div className="mt-4">
              <ProgressChart
                from={from}
                to={today}
                line={shown.map((p) => ({ date: p.date, value: Math.round(p.trend * 10) / 10 }))}
                dots={shown.map((p) => ({ date: p.date, value: p.kg }))}
                category="body"
                unit="kg"
                lastLabel={`${lastPoint.date === today ? 'azi' : formatDayMonth(lastPoint.date)} · ${formatNum(lastPoint.trend)} kg`}
                label={`Greutatea: trend ${formatNum(lastPoint.trend)} kg${rate !== null ? `, ${rateText(rate)}` : ''}`}
              />
            </div>
            <p className="mt-2 text-sm text-subtle">
              Punctele sunt cântăririle zilnice; linia e trendul (medie mobilă exponențială), care nu se lasă păcălit de apă și mese.
            </p>
          </>
        ) : (
          <p className="mt-3 text-[17px] text-muted">
            {trend.length === 0 ? 'Notează greutatea câteva zile ca să apară trendul.' : 'Nicio cântărire în acest interval.'}
          </p>
        )}
      </section>

      <section className="border-t border-line pt-4" aria-label="Greutatea de azi">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Stepper
              label="Greutatea de azi (kg)"
              value={weight}
              onChange={(v) => {
                setWeight(v);
                setSaved(false);
              }}
              step={0.1}
            />
          </div>
          <button type="button" className="btn-primary min-h-[48px] px-5" onClick={() => void saveWeight()}>
            Salvează
          </button>
        </div>
        {error && (
          <div className="mt-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {saved && <p className="mt-2 text-[15px] text-muted">Salvată.</p>}
        <p className="mt-2 text-sm text-subtle">Dimineața, în condiții asemănătoare. O singură zi spune puțin; contează trendul.</p>
      </section>

      <section className="border-t border-line pt-4" aria-label="Consum estimat">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">Consum estimat (TDEE dinamic)</h2>
        {estimate ? (
          <>
            <p className="num mt-2 text-[40px] leading-none">
              {formatNum(estimate.kcal, 0)}
              <span className="ml-1 text-[17px] font-semibold text-subtle">kcal pe zi</span>
            </p>
            <p className="mt-2 text-[15px] text-muted">
              Din caloriile notate în {plural(estimate.intakeDays, 'zi', 'zile')} și din cât s-a mișcat trendul greutății în ultimele{' '}
              {plural(estimate.windowDays, 'zi', 'zile')} (aproximativ 7.700 kcal pe kg).
              {targets ? ` Ținta ta e ${formatNum(targets.kcal, 0)} kcal.` : ''}
            </p>
            <p className="mt-1 text-sm text-subtle">
              Estimarea e mai bună cu cât notezi mai complet ce mănânci; mesele uitate o trag în jos.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[15px] text-muted">
            Apare după cel puțin 10 zile cu mâncare notată și greutăți la începutul și la finalul unui interval de minimum 10 zile.
          </p>
        )}
      </section>

      {kcalSeries.length > 1 && (
        <section className="border-t border-line pt-4" aria-label="Calorii pe zi">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-subtle">Calorii pe zi</h2>
          <div className="mt-3">
            <ProgressChart
              from={from}
              to={today}
              line={kcalSeries}
              category="nutrition"
              unit="kcal"
              lastLabel={`${kcalSeries[kcalSeries.length - 1].date === today ? 'azi' : formatDayMonth(kcalSeries[kcalSeries.length - 1].date)} · ${formatNum(kcalSeries[kcalSeries.length - 1].value, 0)} kcal`}
              label="Caloriile pe zi în intervalul ales"
            />
          </div>
        </section>
      )}

      <Panel title="Țintele tale">
        {targets ? (
          <div className="flex flex-col gap-3 text-[15px]">
            {targets.bmrKcal !== null && profile?.sex && profile.height_cm && profile.birth_year && latestKg !== null && (
              <div>
                <p>
                  <span className="num text-3xl">{formatNum(targets.bmrKcal, 0)}</span> kcal metabolism bazal
                </p>
                <p className="mt-1 text-muted">
                  Mifflin-St Jeor, fără activitate: 10×{formatNum(latestKg)} + 6,25×{formatNum(profile.height_cm)} − 5×
                  {new Date().getFullYear() - profile.birth_year} {profile.sex === 'male' ? '+ 5' : '− 161'}. Estimare, nu o
                  măsurătoare.
                </p>
              </div>
            )}
            {targets.bmrKcal === null && (
              <p className="text-muted">Metabolismul bazal are nevoie de sex, an de naștere, înălțime și o greutate notată mai sus.</p>
            )}
            <p>
              <span className="num text-3xl">{formatNum(targets.kcal, 0)}</span> kcal pe zi
              {targets.manual ? ' (țintă setată manual)' : `, faza ${PHASE_LABELS[profile?.nutrition_phase ?? 'maintenance'].toLowerCase()}`}
            </p>
            <p>
              Proteine {targets.protein} g, carbohidrați {targets.carbs} g, grăsimi {targets.fat} g.
            </p>
            {targets.maintenanceKcal && (
              <p className="text-muted">
                Cu activitatea aleasă, întreținerea este {formatNum(targets.maintenanceKcal, 0)} kcal. Bazalul nu include mersul, antrenamentul sau digestia.
                {PHASE_ADJUSTMENT[profile?.nutrition_phase ?? 'maintenance'] !== 0
                  ? ` Ținta aplică ${formatNum(PHASE_ADJUSTMENT[profile?.nutrition_phase ?? 'maintenance'] * 100, 0)}% față de întreținere.`
                  : ''}
              </p>
            )}
            <p className="text-sm text-muted">
              Proteina folosește {PROTEIN_G_PER_KG} g pe kg de greutate: o meta-analiză (Morton și colab., 2018) a găsit că
              beneficiul pentru masa musculară nu mai crește semnificativ peste aproximativ 1,6 g/kg/zi. Grăsimile sunt
              25% din calorii. Sunt puncte de plecare, nu prescripții.
            </p>
            {profile && (
              <p className="text-sm text-muted">
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

    </div>
  );
}
