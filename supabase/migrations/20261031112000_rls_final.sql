-- ============================================================================
-- FINAL ROW LEVEL SECURITY MODEL
-- ----------------------------------------------------------------------------
-- Supersedes the helper-free policies in 20261031111500_direct_uid_rls.sql.
-- Those policies embedded cross-table member lookups inside policies, which
-- recurse between ateliers and members. This migration rebuilds the policy set
-- on narrowly scoped SECURITY DEFINER predicates (search_path pinned, PUBLIC
-- execute revoked) and adds the boundaries the application actually needs:
--
--   * patrons may read the balance on their own order,
--   * staff may resolve patron/artisan names inside their atelier,
--   * anonymous visitors may read the public atelier profile and published
--     lookbook, and may create a pending fitting request without an account,
--   * every other cross-tenant read/write remains denied.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SAFE AUTHORIZATION PREDICATES
-- ----------------------------------------------------------------------------
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

create or replace function public.current_member_atelier_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.atelier_id from public.members m
  where m.id = (select auth.uid()) and m.active
  limit 1;
$$;

create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.members m
  where m.id = (select auth.uid()) and m.active
  limit 1;
$$;

create or replace function public.client_owns_order(target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = target_order and o.client_id = (select auth.uid())
  );
$$;

revoke all on function public.is_atelier_member(uuid) from public, anon;
revoke all on function public.is_atelier_staff(uuid) from public, anon;
revoke all on function public.is_atelier_owner(uuid) from public, anon;
revoke all on function public.current_member_atelier_id() from public, anon;
revoke all on function public.current_member_role() from public, anon;
revoke all on function public.client_owns_order(uuid) from public, anon;
grant execute on function public.is_atelier_member(uuid) to authenticated;
grant execute on function public.is_atelier_staff(uuid) to authenticated;
grant execute on function public.is_atelier_owner(uuid) to authenticated;
grant execute on function public.current_member_atelier_id() to authenticated;
grant execute on function public.current_member_role() to authenticated;
grant execute on function public.client_owns_order(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. INTEGRITY GUARDS
-- ----------------------------------------------------------------------------
create or replace function public.prevent_atelier_creator_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Atelier creator cannot be reassigned';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_atelier_creator_reassignment on public.ateliers;
create trigger prevent_atelier_creator_reassignment
before update on public.ateliers
for each row execute function public.prevent_atelier_creator_reassignment();

create or replace function public.guard_member_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'Member identity cannot be changed';
  end if;
  if new.atelier_id <> old.atelier_id then
    raise exception 'Member tenant cannot be changed';
  end if;

  -- Only an owner of the atelier may change role or active status.
  if not public.is_atelier_owner(old.atelier_id) then
    if new.role <> old.role or new.active <> old.active then
      raise exception 'Only an atelier owner may change member role or active status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_member_mutation on public.members;
create trigger guard_member_mutation
before update on public.members
for each row execute function public.guard_member_mutation();

-- ----------------------------------------------------------------------------
-- 3. REPLACE THE ENTIRE POLICY SET
-- ----------------------------------------------------------------------------
do $$
declare
  policy record;
begin
  for policy in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'ateliers', 'members', 'lookbook_items', 'orders', 'order_financials',
        'order_progress_notes', 'measurements', 'appointments', 'feedback'
      )
  loop
    execute format('drop policy if exists %I on public.%I', policy.policyname, policy.tablename);
  end loop;
end $$;

alter table public.ateliers enable row level security;
alter table public.members enable row level security;
alter table public.lookbook_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_financials enable row level security;
alter table public.order_progress_notes enable row level security;
alter table public.measurements enable row level security;
alter table public.appointments enable row level security;
alter table public.feedback enable row level security;

-- ATELIERS -------------------------------------------------------------------
create policy ateliers_public_read on public.ateliers
  for select to anon using (true);

create policy ateliers_member_read on public.ateliers
  for select to authenticated using (
    created_by = (select auth.uid()) or public.is_atelier_member(id)
  );

create policy ateliers_owner_insert on public.ateliers
  for insert to authenticated with check (created_by = (select auth.uid()));

create policy ateliers_owner_update on public.ateliers
  for update to authenticated
  using (public.is_atelier_owner(id))
  with check (public.is_atelier_owner(id));

-- MEMBERS --------------------------------------------------------------------
create policy members_self_read on public.members
  for select to authenticated using (id = (select auth.uid()));

create policy members_staff_read on public.members
  for select to authenticated using (public.is_atelier_staff(atelier_id));

-- Patrons may resolve the owner/artisans they work with, never other patrons.
create policy members_client_read_staff on public.members
  for select to authenticated using (
    public.current_member_role() = 'client'
    and atelier_id = public.current_member_atelier_id()
    and role in ('owner', 'employee')
  );

create policy members_first_owner_insert on public.members
  for insert to authenticated with check (
    id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.ateliers a
      where a.id = atelier_id and a.created_by = (select auth.uid())
    )
  );

create policy members_owner_insert on public.members
  for insert to authenticated with check (public.is_atelier_owner(atelier_id));

create policy members_self_update on public.members
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy members_owner_update on public.members
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy members_owner_delete on public.members
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- LOOKBOOK -------------------------------------------------------------------
create policy lookbook_public_read on public.lookbook_items
  for select to anon, authenticated using (is_published = true);

create policy lookbook_member_read on public.lookbook_items
  for select to authenticated using (public.is_atelier_member(atelier_id));

create policy lookbook_staff_insert on public.lookbook_items
  for insert to authenticated with check (public.is_atelier_staff(atelier_id));

create policy lookbook_staff_update on public.lookbook_items
  for update to authenticated
  using (public.is_atelier_staff(atelier_id))
  with check (public.is_atelier_staff(atelier_id));

create policy lookbook_owner_delete on public.lookbook_items
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- ORDERS ---------------------------------------------------------------------
create policy orders_owner_read on public.orders
  for select to authenticated using (public.is_atelier_owner(atelier_id));

create policy orders_employee_read_assigned on public.orders
  for select to authenticated using (
    assigned_tailor_id = (select auth.uid()) and public.is_atelier_staff(atelier_id)
  );

create policy orders_client_read_own on public.orders
  for select to authenticated using (
    client_id = (select auth.uid()) and public.is_atelier_member(atelier_id)
  );

create policy orders_owner_insert on public.orders
  for insert to authenticated with check (public.is_atelier_owner(atelier_id));

create policy orders_owner_update on public.orders
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy orders_employee_update_assigned on public.orders
  for update to authenticated
  using (
    assigned_tailor_id = (select auth.uid()) and public.is_atelier_staff(atelier_id)
  )
  with check (
    assigned_tailor_id = (select auth.uid()) and public.is_atelier_staff(atelier_id)
  );

create policy orders_owner_delete on public.orders
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- ORDER FINANCIALS -----------------------------------------------------------
-- Owners manage money. Patrons see the balance on their own order only.
-- Artisans never see this table.
create policy order_financials_owner_read on public.order_financials
  for select to authenticated using (public.is_atelier_owner(atelier_id));

create policy order_financials_client_read_own on public.order_financials
  for select to authenticated using (public.client_owns_order(order_id));

create policy order_financials_owner_insert on public.order_financials
  for insert to authenticated with check (public.is_atelier_owner(atelier_id));

create policy order_financials_owner_update on public.order_financials
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy order_financials_owner_delete on public.order_financials
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- ORDER PROGRESS NOTES -------------------------------------------------------
create policy progress_owner_read on public.order_progress_notes
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.is_atelier_owner(o.atelier_id)
    )
  );

create policy progress_employee_read_assigned on public.order_progress_notes
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.assigned_tailor_id = (select auth.uid())
        and public.is_atelier_member(o.atelier_id)
    )
  );

create policy progress_client_read_own on public.order_progress_notes
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.client_id = (select auth.uid())
        and public.is_atelier_member(o.atelier_id)
    )
  );

create policy progress_staff_insert on public.order_progress_notes
  for insert to authenticated with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.is_atelier_owner(o.atelier_id)
          or (
            o.assigned_tailor_id = (select auth.uid())
            and public.is_atelier_member(o.atelier_id)
          )
        )
    )
  );

create policy progress_owner_update on public.order_progress_notes
  for update to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.is_atelier_owner(o.atelier_id)
    )
  );

-- MEASUREMENTS ---------------------------------------------------------------
create policy measurements_owner_read on public.measurements
  for select to authenticated using (public.is_atelier_owner(atelier_id));

create policy measurements_employee_read_assigned on public.measurements
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.atelier_id = measurements.atelier_id
        and o.client_id = measurements.client_id
        and o.assigned_tailor_id = (select auth.uid())
        and public.is_atelier_member(o.atelier_id)
    )
  );

create policy measurements_client_read_own on public.measurements
  for select to authenticated using (
    client_id = (select auth.uid()) and public.is_atelier_member(atelier_id)
  );

create policy measurements_owner_write on public.measurements
  for all to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy measurements_employee_insert_assigned on public.measurements
  for insert to authenticated with check (
    exists (
      select 1 from public.orders o
      where o.atelier_id = measurements.atelier_id
        and o.client_id = measurements.client_id
        and o.assigned_tailor_id = (select auth.uid())
        and public.is_atelier_member(o.atelier_id)
    )
  );

create policy measurements_employee_update_assigned on public.measurements
  for update to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.atelier_id = measurements.atelier_id
        and o.client_id = measurements.client_id
        and o.assigned_tailor_id = (select auth.uid())
        and public.is_atelier_member(o.atelier_id)
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.atelier_id = measurements.atelier_id
        and o.client_id = measurements.client_id
        and o.assigned_tailor_id = (select auth.uid())
        and public.is_atelier_member(o.atelier_id)
    )
  );

-- APPOINTMENTS ---------------------------------------------------------------
create policy appointments_owner_read on public.appointments
  for select to authenticated using (public.is_atelier_owner(atelier_id));

create policy appointments_employee_read_assigned on public.appointments
  for select to authenticated using (
    assigned_tailor_id = (select auth.uid()) and public.is_atelier_staff(atelier_id)
  );

create policy appointments_client_read_own on public.appointments
  for select to authenticated using (
    client_id = (select auth.uid()) and public.is_atelier_member(atelier_id)
  );

create policy appointments_client_insert_own on public.appointments
  for insert to authenticated with check (
    client_id = (select auth.uid()) and public.is_atelier_member(atelier_id)
  );

-- Anonymous visitors may only file a pending request with no account attached.
create policy appointments_public_insert on public.appointments
  for insert to anon with check (status = 'pending' and client_id is null);

create policy appointments_owner_update on public.appointments
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy appointments_employee_update_assigned on public.appointments
  for update to authenticated
  using (
    assigned_tailor_id = (select auth.uid()) and public.is_atelier_staff(atelier_id)
  )
  with check (
    assigned_tailor_id = (select auth.uid()) and public.is_atelier_staff(atelier_id)
  );

create policy appointments_owner_delete on public.appointments
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- FEEDBACK -------------------------------------------------------------------
create policy feedback_owner_read on public.feedback
  for select to authenticated using (public.is_atelier_owner(atelier_id));

create policy feedback_client_read_own on public.feedback
  for select to authenticated using (
    client_id = (select auth.uid()) and public.is_atelier_member(atelier_id)
  );

create policy feedback_client_insert_own on public.feedback
  for insert to authenticated with check (
    client_id = (select auth.uid()) and public.is_atelier_member(atelier_id)
  );

create policy feedback_owner_update on public.feedback
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

-- ----------------------------------------------------------------------------
-- 4. PUBLIC SURFACE: expose only the marketing columns of an atelier.
-- ----------------------------------------------------------------------------
revoke all on public.ateliers from anon;
grant select (
  id, name, slug, tagline, city, country, default_currency,
  whatsapp_number, default_unit, created_at, updated_at
) on public.ateliers to anon;
