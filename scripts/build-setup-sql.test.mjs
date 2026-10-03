import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSetupSql } from './build-setup-sql.mjs';

describe('supabase/setup.sql', () => {
  it('e la zi cu supabase/migrations (altfel: npm run supabase:setup)', () => {
    expect(readFileSync('supabase/setup.sql', 'utf8')).toBe(buildSetupSql());
  });
});
