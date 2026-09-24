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

/** 1RM estimat cu formula Epley. Doar pentru 1-12 repetări, altfel estimarea nu e de încredere. */
export function estimate1RM(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps < 1 || reps > 12) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Text pentru câmpuri numerice: "82,5" (cu virgulă, cum scrie utilizatorul). */
export function toFieldString(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}
