/** Acceptă atât "82,5", cât și "82.5". Returnează null pentru câmp gol sau invalid. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatNum(n: number, maxDigits = 1): string {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: maxDigits }).format(n);
}

/** Repetări pentru care estimarea 1RM e de încredere. */
export const MAX_1RM_REPS = 12;

/** 1RM estimat cu formula Epley. Doar pentru 1-12 repetări, altfel estimarea nu e de încredere. */
export function estimate1RM(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps < 1 || reps > MAX_1RM_REPS) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Text pentru câmpuri numerice: "82,5" (cu virgulă, cum scrie utilizatorul). */
export function toFieldString(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/**
 * Număr cu substantivul acordat, ca în română: "1 serie", "5 serii", "20 de serii", "101 serii".
 * `de` apare când ultimele două cifre fac 0 (peste 0) sau cel puțin 20.
 */
export function plural(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const tail = Math.abs(n) % 100;
  return n !== 0 && (tail === 0 || tail >= 20) ? `${n} de ${many}` : `${n} ${many}`;
}

/**
 * Greutatea pentru `reps` repetări la un 1RM dat: inversul formulei Epley.
 * 1 repetare = chiar 1RM-ul. Peste MAX_1RM_REPS nu se estimează.
 */
export function weightForReps(oneRm: number, reps: number): number | null {
  if (oneRm <= 0 || reps < 1 || reps > MAX_1RM_REPS) return null;
  if (reps === 1) return oneRm;
  return oneRm / (1 + reps / 30);
}
