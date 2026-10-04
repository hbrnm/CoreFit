import { useApp } from '../context';
import { useLive } from '../hooks/useLive';
import { useToday } from '../hooks/useToday';
import { PREVENTION_ITEMS } from '../data/prevention';
import { db, type LocalFoodEntry, type LocalHealthSession, type LocalPainLog, type LocalWorkoutSession } from '../lib/db';
import { localDateStr, addDays } from '../lib/date';
import {
  AEROBIC_MIN_TARGET,
  entriesHaveProduce,
  focusLabel,
  missionFor,
  nutritionNote,
  painNotes,
  STRENGTH_DAY_TARGET,
  trainingNote,
  type DayPicture,
} from '../lib/longTerm';
import { fiberAdequateIntake, sumEntries, waterGoalMl, computeTargets } from '../lib/nutrition';
import { entriesForDate } from '../lib/nutritionOps';
import { weeklyActivity } from '../lib/workoutStats';
import { Notice, Panel } from './ui';

function inLast7(iso: string, today: string): boolean {
  const date = localDateStr(new Date(iso));
  return date >= addDays(today, -6) && date <= today;
}

export function useDayPicture(): DayPicture | undefined {
  const { userId, profile } = useApp();
  const today = useToday();
  const year = new Date().getFullYear();

  const sessions = useLive(
    () =>
      db.workoutSessions
        .where('[user_id+started_at]')
        .between([userId, ''], [userId, '\uffff'])
        .filter((s) => !s.deleted)
        .toArray(),
    [userId],
  );
  const foods = useLive(() => entriesForDate(userId, today), [userId, today]);
  const day = useLive(() => db.nutritionLogs.get([userId, today]), [userId, today]);
  const weight = useLive(async () => {
    const rows = await db.nutritionLogs.where('user_id').equals(userId).toArray();
    const withWeight = rows.filter((r) => r.body_weight_kg !== null).sort((a, b) => b.log_date.localeCompare(a.log_date));
    return withWeight[0]?.body_weight_kg ?? null;
  }, [userId]);
  const health = useLive(
    () =>
      db.healthSessions
        .where('[user_id+completed_at]')
        .between([userId, ''], [userId, '\uffff'])
        .filter((s) => !s.deleted)
        .toArray(),
    [userId],
  );
  const pain = useLive(
    () =>
      db.painLogs
        .where('[user_id+logged_at]')
        .between([userId, ''], [userId, '\uffff'])
        .filter((l) => !l.deleted)
        .toArray(),
    [userId],
  );
  const marks = useLive(
    () =>
      db.preventionMarks
        .where('user_id')
        .equals(userId)
        .filter((m) => !m.deleted)
        .toArray(),
    [userId],
  );

  if (!sessions.loaded || !foods.loaded || !day.loaded || !weight.loaded || !health.loaded || !pain.loaded || !marks.loaded) {
    return undefined;
  }

  const list = (sessions.data ?? []) as LocalWorkoutSession[];
  const week = weeklyActivity(list, today);
  const foodList = (foods.data ?? []) as LocalFoodEntry[];
  const totals = sumEntries(foodList);
  const targets = computeTargets(profile, weight.data ?? null, year);
  const age = profile?.birth_year ? year - profile.birth_year : null;
  const healthList = (health.data ?? []) as LocalHealthSession[];
  const painList = (pain.data ?? []) as LocalPainLog[];

  return {
    focus: profile?.long_term_focus ?? null,
    strengthDays: week.strengthDays,
    aerobicMin: week.aerobicEquivalentMin,
    strengthToday: list.some((s) => s.kind === 'strength' && s.ended_at !== null && localDateStr(new Date(s.started_at)) === today),
    cardioToday: list.some((s) => s.kind === 'cardio' && s.ended_at !== null && localDateStr(new Date(s.started_at)) === today),
    healthSessionLast7: healthList.some((s) => inLast7(s.completed_at, today)),
    painNotes: painNotes(painList, today),
    foodCount: foodList.length,
    protein: totals.protein,
    proteinTarget: targets?.protein ?? null,
    fiber: totals.fiber,
    fiberTarget: fiberAdequateIntake(profile?.sex ?? null, age),
    waterMl: day.data?.water_ml ?? 0,
    waterGoal: waterGoalMl(profile?.sex ?? null),
    produceKnown: entriesHaveProduce(foodList),
    preventionChecked: new Set((marks.data ?? []).map((m) => m.item_id)).size,
  };
}

export function TodayMission() {
  const picture = useDayPicture();
  if (!picture) return null;
  const mission = missionFor(picture);
  return (
    <Panel title="Misiunea de azi">
      <p className="text-lg leading-snug">{mission.text}</p>
      <p className="mt-2 text-sm text-muted">O singură acțiune, din ce ai notat. Nu se pierde nimic dacă o sari.</p>
    </Panel>
  );
}

export function MyPlan() {
  const { profile } = useApp();
  const picture = useDayPicture();
  if (!picture) return null;
  const protein =
    picture.proteinTarget !== null
      ? `${Math.round(picture.protein)} / ${picture.proteinTarget} g`
      : picture.foodCount > 0
        ? `${Math.round(picture.protein)} g, fără țintă încă`
        : 'nimic notat azi';
  const fiber =
    picture.fiberTarget !== null
      ? `${Math.round(picture.fiber)} / ${picture.fiberTarget} g`
      : `${Math.round(picture.fiber)} g`;
  const produce = picture.foodCount === 0
    ? 'încă nu e notată nicio masă'
    : picture.produceKnown
      ? 'apar în jurnalul de azi'
      : 'nu le recunoaștem încă în numele notate';
  const also = (profile?.long_term_also ?? []).filter((id) => id !== profile?.long_term_focus);

  return (
    <Panel title="Planul meu">
      <div className="flex flex-col gap-4 text-[15px] leading-snug">
        <p>
          {profile?.long_term_focus
            ? `Prioritate: ${focusLabel(profile.long_term_focus)}.`
            : 'Nu ai ales încă o prioritate. Vârsta nu o stabilește.'}
          {also.length > 0 ? ` Și: ${also.map(focusLabel).join(', ')}.` : ''}
        </p>
        <section>
          <h3 className="font-display text-lg font-bold">Corp</h3>
          <p>Forță: {picture.strengthDays}/{STRENGTH_DAY_TARGET} zile, ultimele 7 zile.</p>
          <p>Activitate: {picture.aerobicMin}/{AEROBIC_MIN_TARGET} minute de efort aerobic.</p>
        </section>
        <section>
          <h3 className="font-display text-lg font-bold">Nutriție, azi</h3>
          <p>Proteină: {protein}.</p>
          <p>Fibre: {fiber}.</p>
          <p>Apă: {picture.waterMl} / {picture.waterGoal} ml.</p>
          <p>Legume sau fructe: {produce}.</p>
        </section>
        <section>
          <h3 className="font-display text-lg font-bold">Sănătate</h3>
          <p>Prevenție: {picture.preventionChecked}/{PREVENTION_ITEMS.length} elemente marcate ca verificate.</p>
          <p>
            Recuperare:{' '}
            {picture.painNotes.length > 0
              ? picture.painNotes.join(' ')
              : picture.healthSessionLast7
                ? 'ai o sesiune de mișcare în ultimele 7 zile.'
                : 'nicio sesiune de mobilitate în ultimele 7 zile.'}
          </p>
        </section>
        <p className="text-sm text-muted">
          Nu este un scor. Sunt doar lucrurile deja notate în aplicație. Forța și minutele urmează recomandarea OMS 2020.
        </p>
      </div>
    </Panel>
  );
}

export function TrainingNote() {
  const picture = useDayPicture();
  if (!picture) return null;
  return <Notice tone="info">{trainingNote(picture.strengthDays, picture.aerobicMin)}</Notice>;
}

export function NutritionNote() {
  const picture = useDayPicture();
  if (!picture) return null;
  return <p className="px-1 text-[15px] leading-snug text-muted">{nutritionNote(picture)}</p>;
}
