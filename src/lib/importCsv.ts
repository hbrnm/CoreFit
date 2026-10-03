import { parseSetType, type SetType } from './setTypes';
/*
 * Import de antrenamente din exporturile CSV ale altor aplicații: Hevy, Strong, FitNotes.
 * Totul e pur (fără Dexie, fără React): fișierul se citește pe dispozitiv și nu pleacă nicăieri.
 * Scrierea în baza locală e în importOps.ts.
 *
 * Un import repetat nu dublează: id-urile sesiunilor și ale seriilor sunt derivate stabil din
 * sursă + data antrenamentului + exercițiu + poziția seriei (vezi stableId).
 */

export type ImportSource = 'hevy' | 'strong' | 'fitnotes';

export const SOURCE_LABELS: Record<ImportSource, string> = {
  hevy: 'Hevy',
  strong: 'Strong',
  fitnotes: 'FitNotes',
};

export type WeightUnit = 'kg' | 'lb';

const LB_TO_KG = 0.45359237;

export interface ImportedSet {
  exerciseName: string;
  setType: SetType;
  weightKg: number;
  /** repetări, sau secunde când seria e cronometrată */
  reps: number;
  timed: boolean;
  /** RPE 6-10, altfel null */
  rpe: number | null;
}

export interface ImportedWorkout {
  /** cheie stabilă: sursă + început + nume */
  key: string;
  name: string;
  startedAt: Date;
  endedAt: Date;
  notes: string;
  sets: ImportedSet[];
  /** grupa din FitNotes (Category), pe exercițiu, dacă există */
  categories: Record<string, string>;
}

export interface ParsedImport {
  source: ImportSource;
  workouts: ImportedWorkout[];
  /** rânduri fără repetări și fără durată (cardio pe distanță, rânduri goale) */
  skippedRows: number;
  /** true = fișierul nu spune unitatea, deci contează alegerea utilizatorului */
  unitFromUser: boolean;
}

// ------------------------------------------------------------------ CSV

/** CSV după RFC 4180: ghilimele, ghilimele dublate, rânduri noi în câmpuri. Separatorul se ghicește. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.search(/\r?\n/) === -1 ? src.length : src.search(/\r?\n/));
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delimiter = [',', ';', '\t'].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ',');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const norm = (h: string): string => h.trim().toLowerCase();

export function detectSource(headers: string[]): ImportSource | null {
  const h = new Set(headers.map(norm));
  if (h.has('exercise_title') && h.has('start_time')) return 'hevy';
  if (h.has('exercise name') && h.has('set order')) return 'strong';
  if (h.has('exercise') && h.has('category') && h.has('date')) return 'fitnotes';
  return null;
}

// ------------------------------------------------------------------ valori

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Datele din exporturi, ca oră locală:
 * "15 Sep 2024, 18:02" (Hevy), "2024-01-15 18:30:00" (Strong), "2024-01-15" (FitNotes),
 * și ISO cu fus orar, unde există.
 */
export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  let m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})/.exec(s);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]));
  }
  if (/\d[T ]\d{1,2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 12), Number(m[5] ?? 0), Number(m[6] ?? 0));
    return d.getDate() === Number(m[3]) ? d : null;
  }
  return null;
}

/** Durata din Strong: "1h 5m", "45m", "30s" sau secunde simple. */
export function parseDurationSeconds(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (s === '') return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const parts = [...s.matchAll(/(\d+(?:\.\d+)?)\s*([hms])/g)];
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((sum, [, n, u]) => sum + Number(n) * (u === 'h' ? 3600 : u === 'm' ? 60 : 1), 0));
}

/** Număr din CSV, cu virgulă sau punct zecimal. Gol sau invalid = null. */
export function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function toKg(weight: number, unit: WeightUnit): number {
  return round2(unit === 'lb' ? weight * LB_TO_KG : weight);
}

function rpeOf(raw: string | undefined): number | null {
  const n = num(raw);
  return n !== null && Number.isInteger(n) && n >= 6 && n <= 10 ? n : null;
}

// ------------------------------------------------------------------ formate

interface RowReader {
  get: (row: string[], name: string) => string | undefined;
  has: (name: string) => boolean;
}

function reader(headers: string[]): RowReader {
  const index = new Map(headers.map((h, i) => [norm(h), i]));
  return {
    get: (row, name) => {
      const i = index.get(name);
      return i === undefined ? undefined : row[i];
    },
    has: (name) => index.has(name),
  };
}

/** Coloana de greutate și unitatea ei, dacă antetul o spune ("weight_kg", "Weight (lbs)"). */
function weightColumn(headers: string[], candidates: string[]): { name: string; unit: WeightUnit | null } | null {
  for (const h of headers.map(norm)) {
    if (!candidates.some((c) => h === c || h.startsWith(`${c} (`) || h.startsWith(`${c}_`))) continue;
    if (/lb/.test(h)) return { name: h, unit: 'lb' };
    if (/kg/.test(h)) return { name: h, unit: 'kg' };
    return { name: h, unit: null };
  }
  return null;
}

interface Draft {
  key: string;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  durationS: number | null;
  notes: string;
  sets: ImportedSet[];
  categories: Record<string, string>;
}

/**
 * Transformă rândurile într-o listă de antrenamente.
 * `unit` se folosește doar când fișierul nu spune unitatea (Strong, FitNotes vechi).
 */
export function parseImport(text: string, unit: WeightUnit = 'kg'): ParsedImport | string {
  const rows = parseCsv(text);
  if (rows.length < 2) return 'Fișierul e gol sau nu e un CSV.';
  const headers = rows[0];
  const source = detectSource(headers);
  if (!source) return 'Nu recunosc fișierul. Funcționează exporturile CSV din Hevy, Strong și FitNotes.';
  const r = reader(headers);

  const weight =
    source === 'hevy'
      ? weightColumn(headers, ['weight', 'weight_kg', 'weight_lbs'])
      : weightColumn(headers, ['weight']);
  const perRowUnit = source === 'fitnotes' && r.has('weight unit');
  const unitFromUser = !perRowUnit && weight?.unit == null;

  const drafts = new Map<string, Draft>();
  let skippedRows = 0;

  for (const row of rows.slice(1)) {
    const name = (source === 'hevy' ? r.get(row, 'exercise_title') : source === 'strong' ? r.get(row, 'exercise name') : r.get(row, 'exercise'))?.trim();
    const startRaw = source === 'hevy' ? r.get(row, 'start_time') : r.get(row, 'date');
    const startedAt = startRaw ? parseDate(startRaw) : null;
    if (!name || !startedAt) {
      skippedRows++;
      continue;
    }

    const title = (source === 'hevy' ? r.get(row, 'title') : source === 'strong' ? r.get(row, 'workout name') : '')?.trim() || 'Antrenament importat';
    const key = `${source}|${startedAt.toISOString()}|${title}`;
    let draft = drafts.get(key);
    if (!draft) {
      const endRaw = source === 'hevy' ? r.get(row, 'end_time') : undefined;
      draft = {
        key,
        name: title,
        startedAt,
        endedAt: endRaw ? parseDate(endRaw) : null,
        durationS: source === 'strong' ? parseDurationSeconds(r.get(row, 'duration') ?? '') : null,
        notes: ((source === 'hevy' ? r.get(row, 'description') : source === 'strong' ? r.get(row, 'workout notes') : '') ?? '').trim(),
        sets: [],
        categories: {},
      };
      drafts.set(key, draft);
    }

    const rowUnit: WeightUnit = perRowUnit
      ? /lb/i.test(r.get(row, 'weight unit') ?? '') ? 'lb' : 'kg'
      : (weight?.unit ?? unit);
    const weightRaw = weight ? num(r.get(row, weight.name)) : null;
    const reps = num(r.get(row, 'reps'));
    const seconds =
      source === 'hevy'
        ? num(r.get(row, 'duration_seconds'))
        : source === 'strong'
          ? num(r.get(row, 'seconds'))
          : parseDurationSeconds(r.get(row, 'time') ?? '');

    let value: number;
    let timed = false;
    if (reps !== null && reps > 0) value = Math.round(reps);
    else if (seconds !== null && seconds > 0) {
      value = Math.round(seconds);
      timed = true;
    } else {
      skippedRows++;
      continue;
    }

    const typeRaw = norm((source === 'hevy' ? r.get(row, 'set_type') : source === 'strong' ? r.get(row, 'set order') : '') ?? '');
    draft.sets.push({
      exerciseName: name,
      setType: parseSetType(typeRaw),
      weightKg: weightRaw !== null && weightRaw > 0 ? toKg(weightRaw, rowUnit) : 0,
      reps: value,
      timed,
      rpe: rpeOf(r.get(row, 'rpe')),
    });
    const category = source === 'fitnotes' ? r.get(row, 'category')?.trim() : undefined;
    if (category) draft.categories[name] = category;
  }

  const workouts: ImportedWorkout[] = [...drafts.values()]
    .filter((d) => d.sets.length > 0)
    .map((d) => {
      // fără oră de sfârșit: durata din fișier, altfel o estimare de un minut și jumătate pe serie
      const end =
        d.endedAt && d.endedAt > d.startedAt
          ? d.endedAt
          : new Date(d.startedAt.getTime() + (d.durationS && d.durationS > 0 ? d.durationS : Math.max(20, d.sets.length * 1.5) * 60) * 1000);
      return { key: d.key, name: d.name, startedAt: d.startedAt, endedAt: end, notes: d.notes, sets: d.sets, categories: d.categories };
    })
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  if (workouts.length === 0) return 'Fișierul nu conține serii cu repetări sau durată.';
  return { source, workouts, skippedRows, unitFromUser };
}

// ------------------------------------------------------------------ id-uri stabile

/** UUID derivat din text (SHA-1, format de versiune 5): același text dă mereu același id. */
export async function stableId(...parts: string[]): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(parts.join('\u001f')))).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
