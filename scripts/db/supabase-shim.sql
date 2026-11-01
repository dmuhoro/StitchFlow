-- ============================================================================
-- MINIMAL SUPABASE SHIM FOR DISPOSABLE POSTGRES VERIFICATION
-- ----------------------------------------------------------------------------
-- GitHub Actions and the local `npm run verify:db` script run the real
-- migration chain on a plain postgres:16 container. This shim provides only the
-- pieces the migrations and RLS suite need from a Supabase database: the auth
-- schema, auth.uid()/auth.role(), and the anon/authenticated roles with the same
-- table grants Supabase applies by default.
--
-- This file is NOT applied to a hosted Supabase project.
-- ============================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz,
  aud text not null default 'authenticated',
  role text not null default 'authenticated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;

-- Match Supabase's default grants: RLS, not table privileges, is the boundary.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
