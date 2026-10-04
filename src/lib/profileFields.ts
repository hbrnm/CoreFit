import { parseDecimal } from './numbers';

/*
 * Câmpurile numerice din Profil: text gol înseamnă „necompletat” (null), altfel o valoare
 * validă sau un mesaj de eroare în română. Aceleași limite ca înainte de lista de setări.
 */

export type Parsed = { value: number | null; error?: undefined } | { value?: undefined; error: string };

export function parseBirthYear(text: string, thisYear: number = new Date().getFullYear()): Parsed {
  if (text.trim() === '') return { value: null };
  const y = parseDecimal(text);
  if (y === null || !Number.isInteger(y) || y < 1920 || y > thisYear - 10) return { error: 'Anul nașterii nu este valid.' };
  return { value: y };
}

export function parseHeight(text: string): Parsed {
  if (text.trim() === '') return { value: null };
  const h = parseDecimal(text);
  if (h === null || h < 100 || h > 250) return { error: 'Înălțimea trebuie să fie între 100 și 250 cm.' };
  return { value: h };
}

export function parseKcalOverride(text: string): Parsed {
  if (text.trim() === '') return { value: null };
  const k = parseDecimal(text);
  if (k === null || !Number.isInteger(k) || k < 800 || k > 8000) return { error: 'Ținta manuală de calorii trebuie să fie între 800 și 8000.' };
  return { value: k };
}
