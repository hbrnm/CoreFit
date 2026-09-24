-- CoreFit: schemă, Row Level Security, triggere.
-- Se poate rula din nou fără erori (idempotent).
--
-- Notă de design: aplicația scrie întâi local (IndexedDB) și sincronizează după.
--  * workout_logs și spine_assessments au id generat pe client (uuid), deci upsert pe id.
--  * daily_nutrition_logs este identificat de (user_id, log_date): un rând pe zi.
--  * workout_logs se șterg "soft" (deleted = true), ca ștergerea să ajungă și pe celelalte dispozitive.
--  * updated_at este setat de server și folosit de aplicație pentru a aduce doar modificările noi.

-- ---------------------------------------------------------------- tabele

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  training_split text not null default 'upper_lower'
    check (training_split in ('full_body', 'upper_lower', 'body_part', 'bbls_5day')),
  nutrition_phase text not null default 'maintenance'
    check (nutrition_phase in ('cutting', 'bulking', 'maintenance', 'sugar_free_reset')),
  spine_hygiene_alert boolean not null default true,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null,
  exercise_name text not null,
  set_type text not null
    check (set_type in ('power', '1rm', 'myofibrillar', 'sarcoplasmic', 'mcgill_big3')),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  reps integer not null check (reps >= 0),
  rpe numeric(3, 1) check (rpe >= 1 and rpe <= 10),
  pain_detected boolean not null default false,
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  protein_grams numeric(6, 1) not null check (protein_grams >= 0),
  carbs_grams numeric(6, 1) not null check (carbs_grams >= 0),
  fat_grams numeric(6, 1) not null check (fat_grams >= 0),
  fiber_grams numeric(6, 1) not null default 0 check (fiber_grams >= 0),
  sugar_free_respected boolean not null default true,
  flour_free_respected boolean not null default true,
  body_weight_kg numeric(5, 2) check (body_weight_kg > 0),
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_log_date unique (user_id, log_date)
);

create table if not exists public.spine_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessed_at timestamptz not null,
  flexion_intolerant boolean not null default false,
  extension_intolerant boolean not null default false,
  compression_intolerant boolean not null default false,
  active_scab_picking_identified boolean not null default false,
  recommended_movement text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_logs_user_updated_idx on public.workout_logs (user_id, updated_at);
create index if not exists daily_nutrition_logs_user_updated_idx on public.daily_nutrition_logs (user_id, updated_at);
create index if not exists spine_assessments_user_updated_idx on public.spine_assessments (user_id, updated_at);

-- ---------------------------------------------------------------- updated_at

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['user_profiles', 'workout_logs', 'daily_nutrition_logs', 'spine_assessments']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before insert or update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------- profil creat automat la înregistrare

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- conturi create înainte de această migrare
insert into public.user_profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------- Row Level Security

alter table public.user_profiles enable row level security;
alter table public.workout_logs enable row level security;
alter table public.daily_nutrition_logs enable row level security;
alter table public.spine_assessments enable row level security;

drop policy if exists "own profile: select" on public.user_profiles;
drop policy if exists "own profile: insert" on public.user_profiles;
drop policy if exists "own profile: update" on public.user_profiles;

create policy "own profile: select" on public.user_profiles
  for select to authenticated using (id = auth.uid());
create policy "own profile: insert" on public.user_profiles
  for insert to authenticated with check (id = auth.uid());
create policy "own profile: update" on public.user_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array['workout_logs', 'daily_nutrition_logs', 'spine_assessments']
  loop
    execute format('drop policy if exists "own rows: select" on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);

    execute format(
      'create policy "own rows: select" on public.%I
         for select to authenticated using (user_id = auth.uid())', t);
    execute format(
      'create policy "own rows: insert" on public.%I
         for insert to authenticated with check (user_id = auth.uid())', t);
    execute format(
      'create policy "own rows: update" on public.%I
         for update to authenticated
         using (user_id = auth.uid())
         with check (user_id = auth.uid())', t);
  end loop;
end
$$;
