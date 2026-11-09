-- ============================================================================
-- RESTORE PREREQUISITES
-- ----------------------------------------------------------------------------
-- A `pg_dump --no-owner` archive retains object ACLs, including function
-- EXECUTE grants and revokes. Roles are cluster-level objects and are
-- deliberately not part of a database dump, so a restore into a fresh cluster
-- fails unless the Supabase API roles already exist.
--
-- This file creates only the API roles. It adds no grants: the exact source
-- ACLs must be restored from the dump. The schema itself must come from the
-- dump—recreating tables or broadening function grants here could mask an
-- incomplete or insecure restore.
--
-- Applied by scripts/ops/backup-restore-rehearsal.sh, never to a hosted project.
-- ============================================================================

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
