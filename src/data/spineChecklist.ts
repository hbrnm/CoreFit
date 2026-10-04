import type { RegionId } from '../lib/db';

/*
 * Checklistul zilnic de igienă a spatelui: mișcări scurte, ușoare, de făcut oricând în zi.
 * Nu e tratament: dacă o mișcare doare, se sare (aplicația o spune lângă checklist).
 */

export interface ChecklistItem {
  id: string;
  title: string;
  how: string;
  zone: RegionId | 'general';
}

export const SPINE_CHECKLIST: readonly ChecklistItem[] = [
  { id: 'walk', title: 'Mers pe jos, 10 minute', how: 'În ritmul tău, fără telefonul în mână.', zone: 'general' },
  { id: 'hourly-breaks', title: 'Ridicat de pe scaun la fiecare oră', how: 'Un minut în picioare sau câțiva pași.', zone: 'general' },
  { id: 'decompress', title: 'Decomprimare lombară, 1–2 minute', how: 'Culcat pe spate cu gambele pe un scaun (90/90), respirând lent.', zone: 'lower_back' },
  { id: 'cat-camel', title: 'Pisica–cămila, 8 repetări', how: 'În patru labe, rotunjești și arcuiești ușor spatele, fără să forțezi capetele.', zone: 'lower_back' },
  { id: 'thoracic-ext', title: 'Extensii toracale, 10 repetări', how: 'Pe un scaun cu spătar jos, mâinile la ceafă, te lași ușor pe spate peste spătar.', zone: 'thoracic' },
  { id: 'chin-tuck', title: 'Retracția bărbiei, 10 repetări', how: 'Tragi bărbia drept înapoi, ca pentru „gușă dublă”, 2 secunde.', zone: 'neck' },
];

export const CHECKLIST_IDS = new Set(SPINE_CHECKLIST.map((i) => i.id));
