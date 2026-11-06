-- Sprint 1: atomic owner onboarding.
--
-- The RPC is the only public onboarding boundary. It creates the atelier and
-- its active owner membership in one PostgreSQL transaction, so a failed
-- membership insert cannot leave an unreachable orphan atelier behind.

create or replace function public.create_atelier_with_owner(
  p_name text,
  p_slug text,
  p_tagline text default null,
  p_whatsapp text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_email text;
  caller_name text;
  new_atelier_id uuid;
begin
  if caller is null then
    raise exception 'authentication_required';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'atelier_name_required';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_slug';
  end if;

  select u.email,
         coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
    into caller_email, caller_name
  from auth.users u
  where u.id = caller;

  if caller_email is null then
    raise exception 'authentication_required';
  end if;

  if exists (
    select 1
    from public.members m
    where m.id = caller
      and m.active
  ) then
    raise exception 'already_member';
  end if;

  insert into public.ateliers (name, slug, tagline, whatsapp_number, created_by)
  values (
    btrim(p_name),
    lower(btrim(p_slug)),
    nullif(btrim(p_tagline), ''),
    nullif(btrim(p_whatsapp), ''),
    caller
  )
  returning id into new_atelier_id;

  insert into public.members (id, atelier_id, role, full_name, email, active)
  values (
    caller,
    new_atelier_id,
    'owner',
    coalesce(nullif(btrim(caller_name), ''), 'Atelier Owner'),
    caller_email,
    true
  );

  return new_atelier_id;
end;
$$;

revoke all on function public.create_atelier_with_owner(text, text, text, text) from public, anon;
grant execute on function public.create_atelier_with_owner(text, text, text, text) to authenticated;

-- Retire the old name so there is one supported onboarding contract.
revoke all on function public.create_atelier_for_current_user(text, text, text, text) from public, anon, authenticated;
drop function if exists public.create_atelier_for_current_user(text, text, text, text);
