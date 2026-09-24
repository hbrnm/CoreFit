import { FOODS } from '../data/foods';
import type { LocalFoodEntry, LocalPainLog, LongTermFocus } from './db';
import { addDays, localDateStr } from './date';
import { matchScore } from './foodMatch';
import { REGION_LABELS } from '../data/health';

export const FOCUS_OPTIONS: ReadonlyArray<{ id: LongTermFocus; label: string }> = [
  { id: 'strength', label: 'Forță și masă musculară' },
  { id: 'cut_keep_muscle', label: 'Slăbire și păstrarea masei musculare' },
  { id: 'fitness', label: 'Condiție fizică' },
  { id: 'mobility', label: 'Mobilitate' },
  { id: 'general_health', label: 'Sănătate generală' },
  { id: 'capacity', label: 'Menținerea capacității fizice pe termen lung' },
];

export const STRENGTH_DAY_TARGET = 2;
export const AEROBIC_MIN_TARGET = 150;

const PRODUCE_CATEGORIES = new Set(['Legume', 'Fructe']);

export function isFocus(value: unknown): value is LongTermFocus {
  return FOCUS_OPTIONS.some((o) => o.id === value);
}

export function focusLabel(id: LongTermFocus): string {
  return FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

/** Recunoaște legume sau fructe doar după numele din lista locală. Altfel nu presupune. */
export function isProduceName(name: string): boolean {
  return FOODS.some(
    (f) => PRODUCE_CATEGORIES.has(f.category) && matchScore(name, f.name) >= 0.6,
  );
}

export interface DayPicture {
  focus: LongTermFocus | null;
  strengthDays: number;
  aerobicMin: number;
  strengthToday: boolean;
  cardioToday: boolean;
  healthSessionLast7: boolean;
  painNotes: string[];
  foodCount: number;
  protein: number;
  proteinTarget: number | null;
  fiber: number;
  fiberTarget: number | null;
  waterMl: number;
  waterGoal: number;
  produceKnown: boolean;
  preventionChecked: number;
}

export interface Mission {
  text: string;
}

export function painNotes(logs: LocalPainLog[], today: string): string[] {
  const from = addDays(today, -13);
  const recent = logs.filter((l) => !l.deleted && localDateStr(new Date(l.logged_at)) >= from);
  const byRegion = new Map<string, LocalPainLog[]>();
  for (const log of recent) {
    const list = byRegion.get(log.region) ?? [];
    list.push(log);
    byRegion.set(log.region, list);
  }
  const notes: string[] = [];
  for (const [region, list] of byRegion) {
    const sorted = [...list].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    if (sorted.length < 2) continue;
    const prev = sorted[sorted.length - 2];
    const last = sorted[sorted.length - 1];
    if (last.score > prev.score) {
      const label = REGION_LABELS[region as keyof typeof REGION_LABELS] ?? region;
      notes.push(`${label}: ultima notă este ${last.score}, față de ${prev.score} înainte.`);
    }
  }
  return notes;
}

/** O singură acțiune, din datele notate. Fără scor și fără mustrare. */
export function missionFor(p: DayPicture): Mission {
  if (p.painNotes.length > 0) {
    return {
      text: 'Durerea notată a crescut. Astăzi alege o mișcare ușoară sau pauză, și oprește-te dacă se înrăutățește.',
    };
  }

  const needsStrength = !p.strengthToday && p.strengthDays < STRENGTH_DAY_TARGET;
  const needsCardio = !p.cardioToday && p.aerobicMin < AEROBIC_MIN_TARGET;
  const proteinLow =
    p.foodCount > 0 && p.proteinTarget !== null && p.protein < p.proteinTarget * 0.5;

  if (p.focus === 'strength' || p.focus === 'capacity') {
    if (needsStrength) return { text: 'O sesiune de forță, chiar și scurtă, este pasul util de azi.' };
  }
  if (p.focus === 'cut_keep_muscle') {
    if (p.foodCount === 0) return { text: 'Notează următoarea masă și include o sursă de proteină.' };
    if (proteinLow) return { text: 'La următoarea masă, adaugă o sursă de proteină.' };
  }
  if (p.focus === 'fitness' && needsCardio) {
    return { text: '20 de minute de mers astăzi.' };
  }
  if (p.focus === 'mobility' && !p.healthSessionLast7) {
    return { text: 'Un program scurt de mobilitate, de exemplu pauza de 3 minute.' };
  }

  if (needsStrength && p.focus !== 'mobility') {
    return { text: 'O sesiune de forță, chiar și scurtă, este pasul util de azi.' };
  }
  if (needsCardio) return { text: '20 de minute de mers astăzi.' };
  if (p.foodCount > 0 && !p.produceKnown) {
    return { text: 'La următoarea masă, include legume sau un fruct.' };
  }
  if (p.waterMl < p.waterGoal / 2) return { text: 'Un pahar de apă, când îți amintești.' };
  if (p.foodCount === 0 && (p.focus === 'general_health' || p.focus === null)) {
    return { text: 'Notează o masă azi, ca să vezi proteina și fibrele.' };
  }
  return {
    text: 'Pașii notați în ultimele 7 zile acoperă forța și efortul aerob. O plimbare ușoară sau odihna sunt de ajuns.',
  };
}

/** Propoziție pentru modulul de antrenament, doar din sesiunile încheiate. */
export function trainingNote(strengthDays: number, aerobicMin: number): string {
  if (strengthDays === 0 && aerobicMin === 0) {
    return 'Încă nu ai sesiuni încheiate în ultimele 7 zile. Poți începe cu o sesiune scurtă de forță sau cu 20 de minute de mers.';
  }
  if (strengthDays >= STRENGTH_DAY_TARGET && aerobicMin < AEROBIC_MIN_TARGET) {
    return `Ai ${strengthDays} sesiuni de forță în ultimele 7 zile. Următorul pas util poate fi o activitate aerobică ușoară.`;
  }
  if (strengthDays < STRENGTH_DAY_TARGET && aerobicMin >= AEROBIC_MIN_TARGET) {
    return `Activitatea aerobică este la ${aerobicMin} minute. Mai lipsește o zi de forță din cele ${STRENGTH_DAY_TARGET} recomandate.`;
  }
  if (strengthDays >= STRENGTH_DAY_TARGET && aerobicMin >= AEROBIC_MIN_TARGET) {
    return `În ultimele 7 zile ai ${strengthDays} zile de forță și ${aerobicMin} minute de efort aerobic.`;
  }
  return `În ultimele 7 zile: ${strengthDays} ${strengthDays === 1 ? 'zi' : 'zile'} de forță și ${aerobicMin} minute de efort aerobic.`;
}

export function nutritionNote(p: Pick<DayPicture, 'foodCount' | 'protein' | 'proteinTarget' | 'fiber' | 'fiberTarget' | 'produceKnown' | 'waterMl' | 'waterGoal'>): string {
  if (p.foodCount === 0) {
    return 'Jurnalul de azi este gol. O masă notată ajunge ca să vezi proteina și fibrele.';
  }
  const bits: string[] = [];
  if (p.proteinTarget !== null) bits.push(`proteină ${Math.round(p.protein)} din ${p.proteinTarget} g`);
  else bits.push(`proteină ${Math.round(p.protein)} g`);
  if (p.fiberTarget !== null) bits.push(`fibre ${Math.round(p.fiber)} din ${p.fiberTarget} g`);
  else bits.push(`fibre ${Math.round(p.fiber)} g`);
  const produce = p.produceKnown
    ? 'Legume sau fructe apar în numele notate.'
    : 'Nu recunoaștem încă legume sau fructe în numele notate.';
  return `Azi: ${bits.join(', ')}. Apă ${p.waterMl} din ${p.waterGoal} ml. ${produce}`;
}

export function entriesHaveProduce(entries: Array<Pick<LocalFoodEntry, 'name' | 'deleted'>>): boolean {
  return entries.some((e) => !e.deleted && isProduceName(e.name));
}
