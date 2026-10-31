-- StitchFlow security hardening.
-- Requires the foundation and owner-onboarding migrations already applied to the project.

create table if not exists public.order_financials (
  order_id uuid primary key references public.orders(id) on delete cascade,
  atelier_id uuid not null references public.ateliers(id) on delete cascade,
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  balance_due numeric(12,2) not null default 0 check (balance_due >= 0),
  currency text not null default 'KES' check (currency in ('KES','USD')),
  updated_at timestamptz not null default now()
);

insert into public.order_financials (order_id, atelier_id, deposit_amount, balance_due, currency)
select id, atelier_id, deposit_amount, balance_due, currency
from public.orders
on conflict (order_id) do nothing;

alter table public.orders drop column if exists deposit_amount;
alter table public.orders drop column if exists balance_due;
alter table public.orders drop column if exists currency;

create index if not exists order_financials_atelier_idx on public.order_financials(atelier_id);

create or replace function public.prevent_order_tenant_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.atelier_id <> old.atelier_id or new.client_id <> old.client_id then
    raise exception 'Order tenant and patron ownership cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_order_tenant_reassignment on public.orders;
create trigger prevent_order_tenant_reassignment
before update on public.orders
for each row execute function public.prevent_order_tenant_reassignment();

alter table public.order_financials enable row level security;

-- Replace the initial broad staff policies with least-privilege policies.
drop policy if exists orders_member_read on public.orders;
drop policy if exists orders_staff_insert on public.orders;
drop policy if exists orders_staff_update on public.orders;
drop policy if exists orders_owner_delete on public.orders;

create policy orders_owner_read on public.orders for select using (public.is_atelier_owner(atelier_id));
create policy orders_employee_read_assigned on public.orders for select using (
  public.current_member_role(atelier_id) = 'employee' and assigned_tailor_id = auth.uid()
);
create policy orders_client_read_own on public.orders for select using (
  public.current_member_role(atelier_id) = 'client' and client_id = auth.uid()
);
create policy orders_owner_insert on public.orders for insert with check (public.is_atelier_owner(atelier_id));
create policy orders_owner_update on public.orders for update using (public.is_atelier_owner(atelier_id)) with check (public.is_atelier_owner(atelier_id));
create policy orders_employee_update_assigned on public.orders for update using (
  public.current_member_role(atelier_id) = 'employee' and assigned_tailor_id = auth.uid()
) with check (
  public.current_member_role(atelier_id) = 'employee' and assigned_tailor_id = auth.uid()
);
create policy orders_owner_delete on public.orders for delete using (public.is_atelier_owner(atelier_id));

create policy order_financials_owner_read on public.order_financials for select using (public.is_atelier_owner(atelier_id));
create policy order_financials_owner_insert on public.order_financials for insert with check (public.is_atelier_owner(atelier_id));
create policy order_financials_owner_update on public.order_financials for update using (public.is_atelier_owner(atelier_id)) with check (public.is_atelier_owner(atelier_id));
create policy order_financials_owner_delete on public.order_financials for delete using (public.is_atelier_owner(atelier_id));

-- Progress is visible only to the owner, assigned artisan, or patron on that order.
drop policy if exists progress_member_read on public.order_progress_notes;
drop policy if exists progress_staff_insert on public.order_progress_notes;
drop policy if exists progress_staff_update on public.order_progress_notes;
create policy progress_owner_read on public.order_progress_notes for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.is_atelier_owner(o.atelier_id))
);
create policy progress_employee_read_assigned on public.order_progress_notes for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.current_member_role(o.atelier_id) = 'employee' and o.assigned_tailor_id = auth.uid())
);
create policy progress_client_read_own on public.order_progress_notes for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.current_member_role(o.atelier_id) = 'client' and o.client_id = auth.uid())
);
create policy progress_staff_insert on public.order_progress_notes for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and (public.is_atelier_owner(o.atelier_id) or (public.current_member_role(o.atelier_id) = 'employee' and o.assigned_tailor_id = auth.uid())))
);
create policy progress_owner_update on public.order_progress_notes for update using (
  exists (select 1 from public.orders o where o.id = order_id and public.is_atelier_owner(o.atelier_id))
);

-- An artisan may inspect cards for assigned commissions, but not every patron in the atelier.
drop policy if exists measurements_member_read on public.measurements;
drop policy if exists measurements_staff_insert on public.measurements;
drop policy if exists measurements_staff_update on public.measurements;
create policy measurements_owner_read on public.measurements for select using (public.is_atelier_owner(atelier_id));
create policy measurements_employee_read_assigned on public.measurements for select using (
  public.current_member_role(atelier_id) = 'employee' and exists (
    select 1 from public.orders o where o.atelier_id = measurements.atelier_id and o.client_id = measurements.client_id and o.assigned_tailor_id = auth.uid()
  )
);
create policy measurements_client_read_own on public.measurements for select using (
  public.current_member_role(atelier_id) = 'client' and client_id = auth.uid()
);
create policy measurements_owner_write on public.measurements for all using (public.is_atelier_owner(atelier_id)) with check (public.is_atelier_owner(atelier_id));
create policy measurements_employee_write_assigned on public.measurements for update using (
  public.current_member_role(atelier_id) = 'employee' and exists (
    select 1 from public.orders o where o.atelier_id = measurements.atelier_id and o.client_id = measurements.client_id and o.assigned_tailor_id = auth.uid()
  )
) with check (
  public.current_member_role(atelier_id) = 'employee' and exists (
    select 1 from public.orders o where o.atelier_id = measurements.atelier_id and o.client_id = measurements.client_id and o.assigned_tailor_id = auth.uid()
  )
);

-- Appointment access is owner-wide, artisan-assigned, or patron-owned.
drop policy if exists appointments_member_read on public.appointments;
drop policy if exists appointments_member_insert on public.appointments;
drop policy if exists appointments_staff_update on public.appointments;
drop policy if exists appointments_owner_delete on public.appointments;
create policy appointments_owner_read on public.appointments for select using (public.is_atelier_owner(atelier_id));
create policy appointments_employee_read_assigned on public.appointments for select using (public.current_member_role(atelier_id) = 'employee' and assigned_tailor_id = auth.uid());
create policy appointments_client_read_own on public.appointments for select using (public.current_member_role(atelier_id) = 'client' and client_id = auth.uid());
create policy appointments_client_insert_own on public.appointments for insert with check (public.current_member_role(atelier_id) = 'client' and client_id = auth.uid());
create policy appointments_owner_update on public.appointments for update using (public.is_atelier_owner(atelier_id)) with check (public.is_atelier_owner(atelier_id));
create policy appointments_employee_update_assigned on public.appointments for update using (public.current_member_role(atelier_id) = 'employee' and assigned_tailor_id = auth.uid()) with check (public.current_member_role(atelier_id) = 'employee' and assigned_tailor_id = auth.uid());
create policy appointments_owner_delete on public.appointments for delete using (public.is_atelier_owner(atelier_id));

-- Published lookbook entries remain public; unpublished entries are tenant-private.
drop policy if exists lookbook_public_read on public.lookbook_items;
drop policy if exists lookbook_staff_read on public.lookbook_items;
create policy lookbook_public_read on public.lookbook_items for select using (is_published = true);
create policy lookbook_member_read_private on public.lookbook_items for select using (public.is_atelier_member(atelier_id));

create or replace view public.orders_operational with (security_invoker = true) as
select id, atelier_id, order_code, client_id, assigned_tailor_id, status, description, garment_type,
       fabric_details, estimated_delivery, photo_url, created_at, updated_at
from public.orders;

grant select on public.orders_operational to authenticated, anon;
