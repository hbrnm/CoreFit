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
