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
