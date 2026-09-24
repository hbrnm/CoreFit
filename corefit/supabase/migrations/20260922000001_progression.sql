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
