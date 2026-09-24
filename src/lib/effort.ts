import type { EffortScale } from './db';

export function parseEffort(raw: string, scale: EffortScale): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (scale === 'rir' && (n === 0 || n === 1 || n === 2 || n === 3 || n === 4)) return n;
  if (scale === 'rpe' && (n === 6 || n === 7 || n === 8 || n === 9 || n === 10)) return n;
  return null;
}

export function formatEffort(value: number | null | undefined, scale: EffortScale | null | undefined): string {
  if (value == null || !scale) return '';
  if (scale === 'rir') return value >= 4 ? 'RIR 4+' : `RIR ${value}`;
  return `RPE ${value}`;
}

export const RIR_OPTIONS = ['0', '1', '2', '3', '4'] as const;
export const RPE_OPTIONS = ['6', '7', '8', '9', '10'] as const;
