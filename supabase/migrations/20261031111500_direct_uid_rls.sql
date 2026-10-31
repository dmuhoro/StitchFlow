-- Replace security-definer authorization helpers with direct auth.uid() predicates.
-- The caller's own members row is visible without recursive policy evaluation.

alter table public.ateliers add column if not exists created_by uuid references auth.users(id) on delete restrict;

-- This project has no live ateliers yet. Existing deployments with rows must backfill
-- created_by from an audited owner before making this column NOT NULL.
create index if not exists ateliers_created_by_idx on public.ateliers(created_by);

-- Remove all policies that depended on security-definer helper functions.
drop policy if exists ateliers_member_read on public.ateliers;
drop policy if exists ateliers_owner_update on public.ateliers;
drop policy if exists members_member_read on public.members;
drop policy if exists members_owner_insert on public.members;
drop policy if exists members_owner_update on public.members;
drop policy if exists lookbook_public_read on public.lookbook_items;
drop policy if exists lookbook_staff_read on public.lookbook_items;
drop policy if exists lookbook_staff_insert on public.lookbook_items;
drop policy if exists lookbook_staff_update on public.lookbook_items;
drop policy if exists lookbook_owner_delete on public.lookbook_items;
drop policy if exists orders_owner_read on public.orders;
drop policy if exists orders_employee_read_assigned on public.orders;
drop policy if exists orders_client_read_own on public.orders;
drop policy if exists orders_owner_insert on public.orders;
drop policy if exists orders_owner_update on public.orders;
drop policy if exists orders_employee_update_assigned on public.orders;
drop policy if exists orders_owner_delete on public.orders;
drop policy if exists order_financials_owner_read on public.order_financials;
drop policy if exists order_financials_owner_insert on public.order_financials;
drop policy if exists order_financials_owner_update on public.order_financials;
drop policy if exists order_financials_owner_delete on public.order_financials;
drop policy if exists progress_owner_read on public.order_progress_notes;
drop policy if exists progress_employee_read_assigned on public.order_progress_notes;
drop policy if exists progress_client_read_own on public.order_progress_notes;
drop policy if exists progress_staff_insert on public.order_progress_notes;
drop policy if exists progress_owner_update on public.order_progress_notes;
drop policy if exists measurements_owner_read on public.measurements;
drop policy if exists measurements_employee_read_assigned on public.measurements;
drop policy if exists measurements_client_read_own on public.measurements;
drop policy if exists measurements_owner_write on public.measurements;
drop policy if exists measurements_employee_write_assigned on public.measurements;
drop policy if exists appointments_owner_read on public.appointments;
drop policy if exists appointments_employee_read_assigned on public.appointments;
drop policy if exists appointments_client_read_own on public.appointments;
drop policy if exists appointments_client_insert_own on public.appointments;
drop policy if exists appointments_owner_update on public.appointments;
drop policy if exists appointments_employee_update_assigned on public.appointments;
drop policy if exists appointments_owner_delete on public.appointments;
drop policy if exists feedback_member_read on public.feedback;
drop policy if exists feedback_client_insert on public.feedback;
drop policy if exists feedback_owner_update on public.feedback;

create policy ateliers_member_read on public.ateliers for select using (
  created_by = (select auth.uid())
  or exists (select 1 from public.members m where m.atelier_id = ateliers.id and m.id = (select auth.uid()) and m.active)
);
create policy ateliers_authenticated_insert on public.ateliers for insert with check (created_by = (select auth.uid()));
create policy ateliers_owner_update on public.ateliers for update using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy members_self_or_owner_read on public.members for select using (
  id = (select auth.uid())
  or exists (select 1 from public.ateliers a where a.id = members.atelier_id and a.created_by = (select auth.uid()))
);
create policy members_first_owner_insert on public.members for insert with check (
  id = (select auth.uid()) and role = 'owner'
  and exists (select 1 from public.ateliers a where a.id = members.atelier_id and a.created_by = (select auth.uid()))
);
create policy members_owner_insert on public.members for insert with check (
  exists (select 1 from public.ateliers a where a.id = members.atelier_id and a.created_by = (select auth.uid()))
);
create policy members_self_update on public.members for update using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = members.role and atelier_id = members.atelier_id);
create policy members_owner_update on public.members for update using (
  exists (select 1 from public.ateliers a where a.id = members.atelier_id and a.created_by = (select auth.uid()))
) with check (exists (select 1 from public.ateliers a where a.id = members.atelier_id and a.created_by = (select auth.uid())));

create policy lookbook_public_read on public.lookbook_items for select using (is_published = true);
create policy lookbook_member_read_private on public.lookbook_items for select using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = lookbook_items.atelier_id and m.active)
);
create policy lookbook_staff_insert on public.lookbook_items for insert with check (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = lookbook_items.atelier_id and m.active and m.role in ('owner','employee'))
);
create policy lookbook_staff_update on public.lookbook_items for update using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = lookbook_items.atelier_id and m.active and m.role in ('owner','employee'))
) with check (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = lookbook_items.atelier_id and m.active and m.role in ('owner','employee'))
);
create policy lookbook_owner_delete on public.lookbook_items for delete using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = lookbook_items.atelier_id and m.active and m.role = 'owner')
);

create policy orders_owner_read on public.orders for select using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'owner')
);
create policy orders_employee_read_assigned on public.orders for select using (
  assigned_tailor_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'employee')
);
create policy orders_client_read_own on public.orders for select using (
  client_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'client')
);
create policy orders_owner_insert on public.orders for insert with check (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'owner')
);
create policy orders_owner_update on public.orders for update using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'owner')
) with check (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'owner')
);
create policy orders_employee_update_assigned on public.orders for update using (
  assigned_tailor_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'employee')
) with check (
  assigned_tailor_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'employee')
);
create policy orders_owner_delete on public.orders for delete using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = orders.atelier_id and m.active and m.role = 'owner')
);

create policy order_financials_owner_read on public.order_financials for select using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = order_financials.atelier_id and m.active and m.role = 'owner')
);
create policy order_financials_owner_insert on public.order_financials for insert with check (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = order_financials.atelier_id and m.active and m.role = 'owner')
);
create policy order_financials_owner_update on public.order_financials for update using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = order_financials.atelier_id and m.active and m.role = 'owner')
) with check (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = order_financials.atelier_id and m.active and m.role = 'owner')
);
create policy order_financials_owner_delete on public.order_financials for delete using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = order_financials.atelier_id and m.active and m.role = 'owner')
);

create policy progress_owner_read on public.order_progress_notes for select using (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.id = order_id and m.id = (select auth.uid()) and m.active and m.role = 'owner'));
create policy progress_employee_read_assigned on public.order_progress_notes for select using (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.id = order_id and o.assigned_tailor_id = (select auth.uid()) and m.id = (select auth.uid()) and m.active and m.role = 'employee'));
create policy progress_client_read_own on public.order_progress_notes for select using (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.id = order_id and o.client_id = (select auth.uid()) and m.id = (select auth.uid()) and m.active and m.role = 'client'));
create policy progress_staff_insert on public.order_progress_notes for insert with check (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.id = order_id and m.id = (select auth.uid()) and m.active and (m.role = 'owner' or (m.role = 'employee' and o.assigned_tailor_id = (select auth.uid())))));
create policy progress_owner_update on public.order_progress_notes for update using (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.id = order_id and m.id = (select auth.uid()) and m.active and m.role = 'owner'));

create policy measurements_owner_read on public.measurements for select using (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = measurements.atelier_id and m.active and m.role = 'owner'));
create policy measurements_employee_read_assigned on public.measurements for select using (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.atelier_id = measurements.atelier_id and o.client_id = measurements.client_id and o.assigned_tailor_id = (select auth.uid()) and m.id = (select auth.uid()) and m.active and m.role = 'employee'));
create policy measurements_client_read_own on public.measurements for select using (client_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = measurements.atelier_id and m.active and m.role = 'client'));
create policy measurements_owner_write on public.measurements for all using (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = measurements.atelier_id and m.active and m.role = 'owner')) with check (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = measurements.atelier_id and m.active and m.role = 'owner'));
create policy measurements_employee_write_assigned on public.measurements for update using (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.atelier_id = measurements.atelier_id and o.client_id = measurements.client_id and o.assigned_tailor_id = (select auth.uid()) and m.id = (select auth.uid()) and m.active and m.role = 'employee')) with check (exists (select 1 from public.orders o join public.members m on m.atelier_id = o.atelier_id where o.atelier_id = measurements.atelier_id and o.client_id = measurements.client_id and o.assigned_tailor_id = (select auth.uid()) and m.id = (select auth.uid()) and m.active and m.role = 'employee'));

create policy appointments_owner_read on public.appointments for select using (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'owner'));
create policy appointments_employee_read_assigned on public.appointments for select using (assigned_tailor_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'employee'));
create policy appointments_client_read_own on public.appointments for select using (client_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'client'));
create policy appointments_client_insert_own on public.appointments for insert with check (client_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'client'));
create policy appointments_owner_update on public.appointments for update using (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'owner')) with check (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'owner'));
create policy appointments_employee_update_assigned on public.appointments for update using (assigned_tailor_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'employee')) with check (assigned_tailor_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'employee'));
create policy appointments_owner_delete on public.appointments for delete using (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = appointments.atelier_id and m.active and m.role = 'owner'));

create policy feedback_member_read on public.feedback for select using (
  exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = feedback.atelier_id and m.active and (m.role = 'owner' or feedback.client_id = (select auth.uid())))
);
create policy feedback_client_insert on public.feedback for insert with check (client_id = (select auth.uid()) and exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = feedback.atelier_id and m.active and m.role = 'client'));
create policy feedback_owner_update on public.feedback for update using (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = feedback.atelier_id and m.active and m.role = 'owner')) with check (exists (select 1 from public.members m where m.id = (select auth.uid()) and m.atelier_id = feedback.atelier_id and m.active and m.role = 'owner'));

-- No client-facing RPCs remain for authorization or onboarding.
drop function if exists public.create_atelier_for_current_user(text, text, text, text);
drop function if exists public.current_member_role(uuid);
drop function if exists public.is_atelier_member(uuid);
drop function if exists public.is_atelier_owner(uuid);
drop function if exists public.is_atelier_staff(uuid);
