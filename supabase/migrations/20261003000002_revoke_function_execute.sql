-- CoreFit: funcțiile security definer nu se pot apela din API fără cont.
--
-- Postgres dă implicit EXECUTE către public, deci și rolului anon, iar Supabase expune funcțiile
-- din schema public prin /rest/v1/rpc. Nu era o gaură: delete_user_account refuză fără auth.uid(),
-- iar handle_new_user merge doar ca trigger. Dar nici nu trebuie să fie apelabile de oricine.

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;
