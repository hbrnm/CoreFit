-- Preferințe de sănătate pe termen lung și bifele de prevenție.
-- Idempotent.

alter table public.user_profiles
  add column if not exists long_term_focus text;

alter table public.user_profiles
  drop constraint if exists user_profiles_long_term_focus_check;

alter table public.user_profiles
  add constraint user_profiles_long_term_focus_check
  check (
    long_term_focus is null
    or long_term_focus in (
      'strength',
      'cut_keep_muscle',
      'fitness',
      'mobility',
      'general_health',
      'capacity'
    )
  );

alter table public.user_profiles
  add column if not exists long_term_also jsonb not null default '[]'::jsonb;

create table if not exists public.prevention_marks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null check (item_id in ('bp', 'dental', 'vision', 'hearing', 'vaccines', 'screening')),
  marked_on date not null,
  note text not null default '',
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prevention_marks_user_updated_idx
  on public.prevention_marks (user_id, updated_at);

drop trigger if exists set_updated_at on public.prevention_marks;
create trigger set_updated_at
  before insert or update on public.prevention_marks
  for each row execute function public.set_updated_at();

alter table public.prevention_marks enable row level security;

drop policy if exists "own rows: select" on public.prevention_marks;
drop policy if exists "own rows: insert" on public.prevention_marks;
drop policy if exists "own rows: update" on public.prevention_marks;

create policy "own rows: select" on public.prevention_marks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.prevention_marks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.prevention_marks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
