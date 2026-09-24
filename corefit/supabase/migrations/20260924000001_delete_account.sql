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
