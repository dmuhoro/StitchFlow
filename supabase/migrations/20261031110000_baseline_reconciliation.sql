-- ============================================================================
-- BASELINE RECONCILIATION
-- ----------------------------------------------------------------------------
-- The original 001 baseline predates the multi-tenant client contract. Later
-- migrations reference members, order_code, is_published, feedback, helper
-- functions and an owner-onboarding RPC that were applied to the hosted project
-- out-of-band and never committed here. This migration closes that gap so the
-- tracked chain replays cleanly on an empty database.
--
-- Every step is guarded so it is safe on a database that already contains the
-- reconciled shape (the hosted project) as well as on a fresh 001 database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATELIERS: align column names with the client repository contract.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ateliers' and column_name = 'whatsapp'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ateliers' and column_name = 'whatsapp_number'
  ) then
    alter table public.ateliers rename column whatsapp to whatsapp_number;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ateliers' and column_name = 'currency'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ateliers' and column_name = 'default_currency'
  ) then
    alter table public.ateliers rename column currency to default_currency;
  end if;
end $$;

alter table public.ateliers add column if not exists whatsapp_number text;
alter table public.ateliers add column if not exists default_currency text not null default 'KES';
alter table public.ateliers add column if not exists default_unit text not null default 'in';
alter table public.ateliers add column if not exists created_by uuid references auth.users(id) on delete restrict;

-- City and country are optional until the owner completes atelier onboarding.
alter table public.ateliers alter column city drop not null;
alter table public.ateliers alter column country drop not null;

-- ----------------------------------------------------------------------------
-- 1b. LEGACY POLICY/FUNCTION CLEANUP
-- The original baseline policies used security-definer helpers over profiles and
-- depend on columns removed below. Drop them while the old names still exist so
-- the hardened policy set is the only policy set.
-- ----------------------------------------------------------------------------
drop view if exists public.artisan_assigned_orders_view;

drop policy if exists "Public can view atelier basic info" on public.ateliers;
drop policy if exists "Owners can update own atelier" on public.ateliers;
drop policy if exists "Users can manage own profile" on public.profiles;
drop policy if exists "Owners can view atelier profiles" on public.profiles;
drop policy if exists "Employees can view client profiles" on public.profiles;
drop policy if exists "Owners have full access to measurements" on public.measurements;
drop policy if exists "Artisans can view atelier measurements" on public.measurements;
drop policy if exists "Patrons can view own measurements" on public.measurements;
drop policy if exists "Owners have full control over atelier orders" on public.orders;
drop policy if exists "Artisans can view assigned orders" on public.orders;
drop policy if exists "Artisans can update status on assigned orders" on public.orders;
drop policy if exists "Patrons can view own orders" on public.orders;
drop policy if exists "Order progress notes access" on public.order_progress_notes;
drop policy if exists "Artisans and owners can insert progress notes" on public.order_progress_notes;
drop policy if exists "Owners full access to appointments" on public.appointments;
drop policy if exists "Artisans view appointments" on public.appointments;
drop policy if exists "Patrons view own appointments" on public.appointments;
drop policy if exists "Patrons create own appointments" on public.appointments;
drop policy if exists "Public book appointment" on public.appointments;
drop policy if exists "Owners full access to feedback" on public.feedbacks;
drop policy if exists "Patrons create feedback" on public.feedbacks;
drop policy if exists "Patrons view own feedback" on public.feedbacks;
drop policy if exists "Public read published lookbook" on public.lookbook_items;
drop policy if exists "Owners manage lookbook" on public.lookbook_items;

drop function if exists public.current_user_atelier_id();
drop function if exists public.current_user_role();

-- ----------------------------------------------------------------------------
-- 2. PROFILES -> MEMBERS: one membership row per auth user per atelier.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'members'
  ) then
    alter table public.profiles rename to members;
  end if;
end $$;

alter table public.members add column if not exists title text;
alter table public.members add column if not exists active boolean not null default true;
alter table public.members add column if not exists specialty text;
alter table public.members add column if not exists avatar_url text;
alter table public.members add column if not exists phone text;
alter table public.members add column if not exists email text;

-- The prototype stored a plaintext passkey. It has no place in production.
alter table public.members drop column if exists passkey;

-- ----------------------------------------------------------------------------
-- 3. ORDERS: rename the public code and drop denormalised patron/artisan text.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'order_number'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'order_code'
  ) then
    alter table public.orders rename column order_number to order_code;
  end if;
end $$;

alter table public.orders add column if not exists order_code text;

-- Names are resolved from members; keeping copies here drifts and leaks PII.
alter table public.orders drop column if exists client_name;
alter table public.orders drop column if exists client_phone;
alter table public.orders drop column if exists assigned_tailor_name;

alter table public.orders drop constraint if exists uq_atelier_order_number;
create unique index if not exists orders_atelier_order_code_key
  on public.orders (atelier_id, order_code);

-- ----------------------------------------------------------------------------
-- 4. MEASUREMENTS: remove duplicated patron text, support upsert + verification.
-- ----------------------------------------------------------------------------
alter table public.measurements drop column if exists client_name;
alter table public.measurements drop column if exists phone;
alter table public.measurements add column if not exists verified_at timestamptz;

create unique index if not exists measurements_atelier_client_key
  on public.measurements (atelier_id, client_id);

-- ----------------------------------------------------------------------------
-- 5. APPOINTMENTS: contact snapshot is required for anonymous public bookings.
-- ----------------------------------------------------------------------------
alter table public.appointments alter column client_name drop not null;
alter table public.appointments alter column client_phone drop not null;
alter table public.appointments add column if not exists client_email text;
alter table public.appointments add column if not exists assigned_tailor_id uuid;

-- ----------------------------------------------------------------------------
-- 6. FEEDBACKS -> FEEDBACK: align with the client table name.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'feedbacks'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'feedback'
  ) then
    alter table public.feedbacks rename to feedback;
  end if;
end $$;

alter table public.feedback drop column if exists client_name;

-- ----------------------------------------------------------------------------
-- 7. LOOKBOOK: published -> is_published.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lookbook_items' and column_name = 'published'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lookbook_items' and column_name = 'is_published'
  ) then
    alter table public.lookbook_items rename column published to is_published;
  end if;
end $$;

alter table public.lookbook_items add column if not exists is_published boolean not null default true;

-- ----------------------------------------------------------------------------
-- 8. PROGRESS NOTES: tenant is derived from the order, not duplicated.
-- ----------------------------------------------------------------------------
alter table public.order_progress_notes drop column if exists atelier_id;
alter table public.order_progress_notes drop column if exists author_name;

-- ----------------------------------------------------------------------------
-- 9. AUTHORIZATION HELPERS USED BY THE HARDENING MIGRATIONS
-- Security definer keeps policy evaluation out of recursive RLS lookups. The
-- search path is pinned to the empty string and every relation is qualified.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.is_atelier_member(target_atelier uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.id = (select auth.uid())
      and m.atelier_id = target_atelier
      and m.active
  );
$$;

create or replace function public.is_atelier_staff(target_atelier uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.id = (select auth.uid())
      and m.atelier_id = target_atelier
      and m.active
      and m.role in ('owner', 'employee')
  );
$$;

create or replace function public.is_atelier_owner(target_atelier uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.id = (select auth.uid())
      and m.atelier_id = target_atelier
      and m.active
      and m.role = 'owner'
  );
$$;

create or replace function public.current_member_role(target_atelier uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.members m
  where m.id = (select auth.uid())
    and m.atelier_id = target_atelier
    and m.active
  limit 1;
$$;

create or replace function public.create_atelier_for_current_user(
  atelier_name text,
  atelier_slug text,
  atelier_tagline text,
  atelier_whatsapp text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  new_atelier uuid;
begin
  if caller is null then
    raise exception 'Authentication required to create an atelier';
  end if;

  insert into public.ateliers (name, slug, tagline, whatsapp_number, created_by)
  values (atelier_name, atelier_slug, atelier_tagline, atelier_whatsapp, caller)
  returning id into new_atelier;

  insert into public.members (id, atelier_id, role, full_name, email)
  select caller,
         new_atelier,
         'owner',
         coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
         u.email
  from auth.users u
  where u.id = caller;

  return new_atelier;
end;
$$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  command record;
begin
  for command in
    select * from pg_event_trigger_ddl_commands() where command_tag = 'CREATE TABLE'
  loop
    execute format('alter table if exists %s enable row level security', command.object_identity);
  end loop;
end;
$$;

revoke all on function public.is_atelier_member(uuid) from public, anon;
revoke all on function public.is_atelier_staff(uuid) from public, anon;
revoke all on function public.is_atelier_owner(uuid) from public, anon;
revoke all on function public.current_member_role(uuid) from public, anon;
revoke all on function public.create_atelier_for_current_user(text, text, text, text) from public, anon;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

grant execute on function public.is_atelier_member(uuid) to authenticated;
grant execute on function public.is_atelier_staff(uuid) to authenticated;
grant execute on function public.is_atelier_owner(uuid) to authenticated;
grant execute on function public.current_member_role(uuid) to authenticated;
grant execute on function public.create_atelier_for_current_user(text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 11. updated_at TRIGGERS
-- ----------------------------------------------------------------------------
drop trigger if exists ateliers_set_updated_at on public.ateliers;
create trigger ateliers_set_updated_at before update on public.ateliers
for each row execute function public.set_updated_at();

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists measurements_set_updated_at on public.measurements;
create trigger measurements_set_updated_at before update on public.measurements
for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists lookbook_set_updated_at on public.lookbook_items;
create trigger lookbook_set_updated_at before update on public.lookbook_items
for each row execute function public.set_updated_at();
