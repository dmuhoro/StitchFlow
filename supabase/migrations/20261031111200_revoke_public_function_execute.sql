-- PUBLIC grants are inherited by anon/authenticated in Supabase; remove them explicitly.
revoke execute on function public.create_atelier_for_current_user(text, text, text, text) from public;
revoke execute on function public.current_member_role(uuid) from public;
revoke execute on function public.is_atelier_member(uuid) from public;
revoke execute on function public.is_atelier_owner(uuid) from public;
revoke execute on function public.is_atelier_staff(uuid) from public;
revoke execute on function public.rls_auto_enable() from public;
grant execute on function public.create_atelier_for_current_user(text, text, text, text) to authenticated;
grant execute on function public.current_member_role(uuid) to authenticated;
grant execute on function public.is_atelier_member(uuid) to authenticated;
grant execute on function public.is_atelier_owner(uuid) to authenticated;
grant execute on function public.is_atelier_staff(uuid) to authenticated;
