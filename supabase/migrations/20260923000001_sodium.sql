-- Sodiu în miligrame. Idempotent: poate fi rulat și pe o bază care are deja coloanele.

alter table public.food_entries
  add column if not exists sodium numeric(8, 1) not null default 0 check (sodium >= 0);

alter table public.custom_foods
  add column if not exists sodium100 numeric(8, 1) not null default 0 check (sodium100 >= 0);
