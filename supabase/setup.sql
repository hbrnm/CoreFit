-- CoreFit: toată schema Supabase, într-un singur fișier.
-- Generat din supabase/migrations/, în ordine. Se lipește o dată în SQL Editor (Run).
-- E idempotent: rulat de două ori, nu strică nimic.
-- Nu edita aici: schimbările se fac în supabase/migrations/, apoi se regenerează cu
--   npm run supabase:setup

-- ============================================================ 20260920000001_create_fitness_schema.sql

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

-- ============================================================ 20260921000001_modules_v2.sql

-- CoreFit v2: antrenament complet (sesiuni, rutine), sănătate (durere, programe), nutriție (jurnal, rețete).
-- Rulează după 20260920000001. Se poate rula din nou fără erori (idempotent).

-- ---------------------------------------------------------------- profil: date pentru ținte de calorii

alter table public.user_profiles add column if not exists sex text check (sex in ('male', 'female'));
alter table public.user_profiles add column if not exists birth_year integer check (birth_year between 1900 and 2100);
alter table public.user_profiles add column if not exists height_cm numeric(5, 1) check (height_cm between 50 and 260);
alter table public.user_profiles add column if not exists activity_level text not null default 'light'
  check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active'));
alter table public.user_profiles add column if not exists kcal_target_override integer
  check (kcal_target_override between 800 and 8000);

-- ---------------------------------------------------------------- seturi (workout_logs)

alter table public.workout_logs add column if not exists session_id uuid;
alter table public.workout_logs add column if not exists exercise_id text not null default '';
alter table public.workout_logs add column if not exists set_order integer not null default 0;

alter table public.workout_logs drop constraint if exists workout_logs_set_type_check;
update public.workout_logs set set_type = 'work' where set_type not in ('work', 'warmup');
alter table public.workout_logs add constraint workout_logs_set_type_check check (set_type in ('work', 'warmup'));

create index if not exists workout_logs_session_idx on public.workout_logs (session_id);

-- ---------------------------------------------------------------- evaluări coloană: același model ca restul

alter table public.spine_assessments add column if not exists client_updated_at timestamptz not null default now();
alter table public.spine_assessments add column if not exists deleted boolean not null default false;

-- ---------------------------------------------------------------- nutriție zilnică: doar greutate, apă, provocare

alter table public.daily_nutrition_logs drop column if exists protein_grams;
alter table public.daily_nutrition_logs drop column if exists carbs_grams;
alter table public.daily_nutrition_logs drop column if exists fat_grams;
alter table public.daily_nutrition_logs drop column if exists fiber_grams;
alter table public.daily_nutrition_logs alter column sugar_free_respected drop not null;
alter table public.daily_nutrition_logs alter column sugar_free_respected set default null;
alter table public.daily_nutrition_logs alter column flour_free_respected drop not null;
alter table public.daily_nutrition_logs alter column flour_free_respected set default null;
alter table public.daily_nutrition_logs add column if not exists water_ml integer not null default 0 check (water_ml >= 0);

-- ---------------------------------------------------------------- tabele noi

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'strength' check (kind in ('strength', 'cardio')),
  name text not null default '',
  routine_id uuid,
  activity text,
  intensity text check (intensity in ('moderate', 'vigorous')),
  started_at timestamptz not null,
  ended_at timestamptz,
  notes text not null default '',
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  muscle text not null,
  equipment text not null,
  kind text not null check (kind in ('reps', 'bodyweight', 'duration')),
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pain_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  region text not null,
  score integer not null check (score between 0 and 10),
  note text not null default '',
  logged_at timestamptz not null,
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_s integer not null default 0 check (duration_s >= 0),
  pain_before integer check (pain_before between 0 and 10),
  pain_after integer check (pain_after between 0 and 10),
  stopped_for_pain boolean not null default false,
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  amount_text text not null default '',
  kcal numeric(8, 1) not null default 0 check (kcal >= 0),
  protein numeric(7, 1) not null default 0 check (protein >= 0),
  carbs numeric(7, 1) not null default 0 check (carbs >= 0),
  fat numeric(7, 1) not null default 0 check (fat >= 0),
  fiber numeric(7, 1) not null default 0 check (fiber >= 0),
  sugar numeric(7, 1) not null default 0 check (sugar >= 0),
  source text not null default 'quick' check (source in ('builtin', 'off', 'custom', 'recipe', 'quick')),
  logged_at timestamptz not null,
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text not null default '',
  barcode text,
  kcal100 numeric(7, 1) not null default 0 check (kcal100 >= 0),
  protein100 numeric(6, 1) not null default 0 check (protein100 >= 0),
  carbs100 numeric(6, 1) not null default 0 check (carbs100 >= 0),
  fat100 numeric(6, 1) not null default 0 check (fat100 >= 0),
  fiber100 numeric(6, 1) not null default 0 check (fiber100 >= 0),
  sugar100 numeric(6, 1) not null default 0 check (sugar100 >= 0),
  serving_g numeric(7, 1),
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  servings numeric(5, 1) not null default 1 check (servings > 0),
  cooked_weight_g numeric(8, 1) check (cooked_weight_g > 0),
  ingredients jsonb not null default '[]'::jsonb,
  notes text not null default '',
  deleted boolean not null default false,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexuri, triggere, RLS pentru tabelele noi

create index if not exists workout_sessions_user_updated_idx on public.workout_sessions (user_id, updated_at);
create index if not exists routines_user_updated_idx on public.routines (user_id, updated_at);
create index if not exists custom_exercises_user_updated_idx on public.custom_exercises (user_id, updated_at);
create index if not exists pain_logs_user_updated_idx on public.pain_logs (user_id, updated_at);
create index if not exists health_sessions_user_updated_idx on public.health_sessions (user_id, updated_at);
create index if not exists food_entries_user_updated_idx on public.food_entries (user_id, updated_at);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, log_date);
create index if not exists custom_foods_user_updated_idx on public.custom_foods (user_id, updated_at);
create index if not exists recipes_user_updated_idx on public.recipes (user_id, updated_at);

do $$
declare
  t text;
begin
  foreach t in array array[
    'workout_sessions', 'routines', 'custom_exercises', 'pain_logs',
    'health_sessions', 'food_entries', 'custom_foods', 'recipes'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before insert or update on public.%I
         for each row execute function public.set_updated_at()', t);

    execute format('alter table public.%I enable row level security', t);

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

-- ============================================================ 20260922000001_progression.sql

-- CoreFit: progresie automată la antrenament (regulă implicită pe rutină, override pe exercițiu
-- stocat în jsonb-ul deja existent `exercises`), sesiuni de deload care nu avansează progresia.
-- Rulează după 20260921000001. Idempotent.

alter table public.routines add column if not exists default_progression text not null default 'none'
  check (default_progression in ('none', 'linear', 'double', 'greyskull'));
alter table public.routines add column if not exists progression_increment_kg numeric(6, 2) not null default 2.5
  check (progression_increment_kg >= 0);
alter table public.routines add column if not exists progression_reset_pct numeric(4, 2) not null default 0.1
  check (progression_reset_pct >= 0 and progression_reset_pct <= 1);
alter table public.routines add column if not exists is_deload boolean not null default false;

alter table public.workout_sessions add column if not exists is_deload boolean not null default false;

-- ============================================================ 20260923000001_sodium.sql

-- Sodiu în miligrame. Idempotent: poate fi rulat și pe o bază care are deja coloanele.

alter table public.food_entries
  add column if not exists sodium numeric(8, 1) not null default 0 check (sodium >= 0);

alter table public.custom_foods
  add column if not exists sodium100 numeric(8, 1) not null default 0 check (sodium100 >= 0);

-- ============================================================ 20260923000002_long_term.sql

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

-- ============================================================ 20260923000003_training_tools.sql

-- Unelte de antrenament: efort, favorite, plan săptămânal. Idempotent.

alter table public.workout_logs
  add column if not exists effort_scale text;

alter table public.workout_logs
  drop constraint if exists workout_logs_effort_scale_check;

alter table public.workout_logs
  add constraint workout_logs_effort_scale_check
  check (effort_scale is null or effort_scale in ('rir', 'rpe'));

alter table public.user_profiles
  add column if not exists effort_scale text not null default 'rir';

alter table public.user_profiles
  drop constraint if exists user_profiles_effort_scale_check;

alter table public.user_profiles
  add constraint user_profiles_effort_scale_check
  check (effort_scale in ('rir', 'rpe'));

alter table public.user_profiles
  add column if not exists week_starts_on text not null default 'monday';

alter table public.user_profiles
  drop constraint if exists user_profiles_week_starts_on_check;

alter table public.user_profiles
  add constraint user_profiles_week_starts_on_check
  check (week_starts_on in ('monday', 'sunday'));

alter table public.user_profiles
  add column if not exists favorite_exercise_ids jsonb not null default '[]'::jsonb;

alter table public.user_profiles
  add column if not exists week_slots jsonb not null default '{}'::jsonb;

alter table public.user_profiles
  add column if not exists week_moves jsonb not null default '[]'::jsonb;

-- ============================================================ 20260924000001_delete_account.sql

-- CoreFit: RPC function to allow authenticated users to delete their own account.
-- This will delete the user from auth.users, and the cascade will clean up public schema data.

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete from auth.users. The 'on delete cascade' constraints in the schema 
  -- will handle deleting records from user_profiles and all other tables.
  delete from auth.users where id = current_user_id;
end;
$$;

-- Grant execution permission to authenticated users
grant execute on function public.delete_user_account() to authenticated;

-- ============================================================ 20261003000001_rls_select_auth_uid.sql

-- CoreFit: politicile RLS revin la forma `(select auth.uid())`.
--
-- Migrările din 20 și 21 septembrie au fost editate după un audit care recomanda `auth.uid()`
-- simplu. Recomandarea era inversă: documentația Supabase cere ca funcția să fie învelită în
-- `select`, ca Postgres s-o calculeze o singură dată pe interogare (initPlan), nu pe fiecare rând.
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Securitatea e aceeași în ambele forme; se schimbă doar viteza pe tabele mari.
-- Idempotentă: se poate rula de mai multe ori.

drop policy if exists "own profile: select" on public.user_profiles;
drop policy if exists "own profile: insert" on public.user_profiles;
drop policy if exists "own profile: update" on public.user_profiles;

create policy "own profile: select" on public.user_profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile: insert" on public.user_profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "own profile: update" on public.user_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'workout_logs', 'daily_nutrition_logs', 'spine_assessments',
    'workout_sessions', 'routines', 'custom_exercises', 'pain_logs',
    'health_sessions', 'food_entries', 'custom_foods', 'recipes'
  ]
  loop
    execute format('drop policy if exists "own rows: select" on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);

    execute format(
      'create policy "own rows: select" on public.%I
         for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "own rows: insert" on public.%I
         for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "own rows: update" on public.%I
         for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end
$$;

-- ============================================================ 20261003000002_revoke_function_execute.sql

-- CoreFit: funcțiile security definer nu se pot apela din API fără cont.
--
-- Postgres dă implicit EXECUTE către public, deci și rolului anon, iar Supabase expune funcțiile
-- din schema public prin /rest/v1/rpc. Nu era o gaură: delete_user_account refuză fără auth.uid(),
-- iar handle_new_user merge doar ca trigger. Dar nici nu trebuie să fie apelabile de oricine.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;
