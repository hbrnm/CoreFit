import { CHECKLIST_IDS } from '../data/spineChecklist';
import { addDays } from './date';
import { db, stamp, type LocalSpineChecklist } from './db';

/** Lista bifată după apăsarea pe `id`: adaugă sau scoate; păstrează doar id-uri cunoscute. */
export function toggled(done: readonly string[], id: string): string[] {
  const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
  return next.filter((d) => CHECKLIST_IDS.has(d));
}

export async function toggleChecklistItem(userId: string, date: string, id: string): Promise<void> {
  await db.transaction('rw', db.spineChecklists, async () => {
    const cur = await db.spineChecklists.get([userId, date]);
    const row: LocalSpineChecklist = { user_id: userId, log_date: date, done: toggled(cur?.done ?? [], id), ...stamp() };
    await db.spineChecklists.put(row);
  });
}

/** Zile la rând, până azi inclusiv (sau până ieri, dacă azi încă nu e nimic), cu cel puțin `min` bife. */
export function checklistStreak(rows: ReadonlyArray<Pick<LocalSpineChecklist, 'log_date' | 'done'>>, today: string, min = 3): number {
  const byDate = new Map(rows.map((r) => [r.log_date, r.done.length]));
  let day = (byDate.get(today) ?? 0) >= min ? today : addDays(today, -1);
  let n = 0;
  while ((byDate.get(day) ?? 0) >= min) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}
