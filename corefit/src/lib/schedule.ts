import type { IsoWeekday, LocalProfile, WeekMove } from './db';
import { isoWeekday, startOfWeek, weekDates, type WeekStartsOn } from './date';

export interface DayPlan {
  date: string;
  weekday: IsoWeekday;
  /** rutina fixă, dacă nu a fost mutată din această zi */
  permanentId: string | null;
  /** rutina adusă aici doar în săptămâna aceasta */
  movedId: string | null;
  movedTo: string | null;
}

export function weekStartOf(profile: Pick<LocalProfile, 'week_starts_on'> | null | undefined): WeekStartsOn {
  return profile?.week_starts_on === 'sunday' ? 'sunday' : 'monday';
}

export function planForWeek(profile: LocalProfile, today: string): DayPlan[] {
  const start = weekStartOf(profile);
  const weekOf = startOfWeek(today, start);
  const moves = (profile.week_moves ?? []).filter((m) => m.week_of === weekOf);
  return weekDates(today, start).map((date) => {
    const weekday = String(isoWeekday(date)) as IsoWeekday;
    const permanentId = profile.week_slots?.[weekday] ?? null;
    const incoming = moves.find((m) => m.to_date === date) ?? null;
    const leaving = moves.find((m) => m.from_date === date) ?? null;
    return {
      date,
      weekday,
      permanentId: leaving ? null : permanentId,
      movedId: incoming?.routine_id ?? null,
      movedTo: leaving?.to_date ?? null,
    };
  });
}

export function setWeekSlot(profile: LocalProfile, weekday: IsoWeekday, routineId: string | null): Partial<LocalProfile> {
  const slots = { ...(profile.week_slots ?? {}) };
  if (routineId) slots[weekday] = routineId;
  else delete slots[weekday];
  return { week_slots: slots };
}

/** Mută rutina unei zile, doar în săptămâna care conține `fromDate`. Planul fix rămâne. */
export function moveRoutineThisWeek(profile: LocalProfile, fromDate: string, toDate: string, routineId: string): WeekMove[] {
  const weekOf = startOfWeek(fromDate, weekStartOf(profile));
  const rest = (profile.week_moves ?? []).filter((m) => !(m.week_of === weekOf && m.from_date === fromDate));
  if (fromDate === toDate) return rest;
  return [...rest, { id: crypto.randomUUID(), week_of: weekOf, from_date: fromDate, to_date: toDate, routine_id: routineId }];
}

export function clearMove(profile: LocalProfile, fromDate: string): WeekMove[] {
  const weekOf = startOfWeek(fromDate, weekStartOf(profile));
  return (profile.week_moves ?? []).filter((m) => !(m.week_of === weekOf && m.from_date === fromDate));
}
