-- Remove anonymous access to security-definer helpers and pin mutable search paths.

alter function public.set_updated_at() set search_path = public;

revoke all on function public.create_atelier_for_current_user(text, text, text, text) from anon;
revoke all on function public.current_member_role(uuid) from anon;
revoke all on function public.is_atelier_member(uuid) from anon;
revoke all on function public.is_atelier_owner(uuid) from anon;
revoke all on function public.is_atelier_staff(uuid) from anon;
revoke all on function public.rls_auto_enable() from anon;

-- These helpers are called by authenticated RLS policies, not exposed as public RPC APIs.
grant execute on function public.current_member_role(uuid) to authenticated;
grant execute on function public.is_atelier_member(uuid) to authenticated;
grant execute on function public.is_atelier_owner(uuid) to authenticated;
grant execute on function public.is_atelier_staff(uuid) to authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
