// Pune toate migrațiile Supabase într-un singur fișier, supabase/setup.sql,
// ca un proiect nou să se configureze cu o singură rulare în SQL Editor.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'supabase/migrations';

export function buildSetupSql() {
  const header = [
    '-- CoreFit: toată schema Supabase, într-un singur fișier.',
    '-- Generat din supabase/migrations/, în ordine. Se lipește o dată în SQL Editor (Run).',
    '-- E idempotent: rulat de două ori, nu strică nimic.',
    '-- Nu edita aici: schimbările se fac în supabase/migrations/, apoi se regenerează cu',
    '--   npm run supabase:setup',
  ].join('\n');
  const parts = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => `\n-- ============================================================ ${f}\n\n${readFileSync(join(dir, f), 'utf8')}`);
  return `${header}\n${parts.join('')}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync('supabase/setup.sql', buildSetupSql());
  console.log('supabase/setup.sql actualizat');
}
