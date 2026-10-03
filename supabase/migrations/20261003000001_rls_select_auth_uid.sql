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
