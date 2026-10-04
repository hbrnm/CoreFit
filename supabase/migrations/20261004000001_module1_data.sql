-- CoreFit, modulul 1: tipuri de serie, gramajul alimentelor, checklistul zilnic al coloanei.
-- Se poate rula din nou fără erori (idempotent).

-- ---------------------------------------------------------------- tipuri de serie
-- încălzire, normală, drop set, până la eșec (lib/setTypes.ts)
alter table public.workout_logs drop constraint if exists workout_logs_set_type_check;
alter table public.workout_logs add constraint workout_logs_set_type_check
  check (set_type in ('warmup', 'work', 'drop', 'failure'));

-- ---------------------------------------------------------------- gramajul alimentelor
-- null pentru porții și adăugare rapidă; textul afișat rămâne în amount_text
alter table public.food_entries add column if not exists grams numeric(8, 1) check (grams is null or grams >= 0);
update public.food_entries
  set grams = replace(substring(amount_text from '^\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:g|ml)\s*$'), ',', '.')::numeric
  where grams is null and amount_text ~* '^\s*[0-9]+([.,][0-9]+)?\s*(g|ml)\s*$';

-- ---------------------------------------------------------------- checklistul coloanei
-- un rând pe zi și utilizator, ca daily_nutrition_logs
create table if not exists public.spine_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  done text[] not null default '{}',
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spine_checklists_user_date unique (user_id, log_date)
);

create index if not exists spine_checklists_user_updated_idx on public.spine_checklists (user_id, updated_at);

drop trigger if exists set_updated_at on public.spine_checklists;
create trigger set_updated_at before insert or update on public.spine_checklists
  for each row execute function public.set_updated_at();

alter table public.spine_checklists enable row level security;

drop policy if exists "own rows: select" on public.spine_checklists;
drop policy if exists "own rows: insert" on public.spine_checklists;
drop policy if exists "own rows: update" on public.spine_checklists;

create policy "own rows: select" on public.spine_checklists
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.spine_checklists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.spine_checklists
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
