/*
 * Tipurile de serie, ca în Strong și Hevy: încălzire, normală, drop set, până la eșec.
 * Regula de bază: doar încălzirea nu contează. Drop set-urile intră la volum, oboseală și
 * recorduri, dar nu sunt bază pentru progresia automată (sunt serii de descărcare, mai ușoare).
 */

export type SetType = 'warmup' | 'work' | 'drop' | 'failure';

export const SET_TYPES: readonly SetType[] = ['warmup', 'work', 'drop', 'failure'];

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Încălzire',
  work: 'Normală',
  drop: 'Drop set',
  failure: 'Până la eșec',
};

/** Litera din tabelul de serii, în locul numărului (seriile normale au număr). */
export const SET_TYPE_MARK: Record<Exclude<SetType, 'work'>, string> = {
  warmup: 'Î',
  drop: 'D',
  failure: 'E',
};

/** Serie de lucru: intră la volum, oboseală, echilibru muscular, recorduri și 1RM. */
export function isWorkingSet(type: SetType): boolean {
  return type !== 'warmup';
}

/** Serie care poate fi baza progresiei automate (drop set-urile nu sunt). */
export function countsForProgression(type: SetType): boolean {
  return type === 'work' || type === 'failure';
}

/** Următorul tip la apăsare, în ordinea din SET_TYPES. */
export function nextSetType(type: SetType): SetType {
  return SET_TYPES[(SET_TYPES.indexOf(type) + 1) % SET_TYPES.length];
}

/** Tipul din exporturile Hevy, Strong și FitNotes („warmup”, „w”, „dropset”, „d”, „failure”, „f”). */
export function parseSetType(raw: string): SetType {
  const v = raw.trim().toLowerCase();
  if (v === 'warmup' || v === 'warm up' || v === 'w') return 'warmup';
  if (v === 'dropset' || v === 'drop set' || v === 'drop' || v === 'd') return 'drop';
  if (v === 'failure' || v === 'f') return 'failure';
  return 'work';
}
