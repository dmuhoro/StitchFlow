-- Keep the legacy appointment request inbox from claiming a fitting is
-- confirmed unless the protected booking store owns the slot.

-- Guest requests currently have no edge-function rate limit or bot challenge.
-- Disable direct anonymous writes until that protected boundary is deployed.
drop policy if exists appointments_public_insert on public.appointments;
revoke insert on public.appointments from anon;

create or replace function public.guard_appointment_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    if not exists (
      select 1
      from public.bookings b
      where b.appointment_id = new.id
        and b.atelier_id = new.atelier_id
        and b.status = 'confirmed'
    ) then
      raise exception using errcode = '23514', message = 'appointment_requires_confirmed_booking';
    end if;
  elsif new.status = 'completed' then
    if old.status <> 'confirmed' or not exists (
      select 1
      from public.bookings b
      where b.appointment_id = new.id
        and b.atelier_id = new.atelier_id
        and b.status = 'confirmed'
    ) then
      raise exception using errcode = '23514', message = 'appointment_requires_confirmed_booking';
    end if;
  elsif new.status = 'pending' then
    if old.status <> 'confirmed' or exists (
      select 1
      from public.bookings b
      where b.appointment_id = new.id
        and b.atelier_id = new.atelier_id
        and b.status in ('held', 'confirmed')
    ) then
      raise exception using errcode = '23514', message = 'appointment_has_live_booking';
    end if;
  elsif new.status = 'cancelled' then
    if old.status in ('completed', 'cancelled') or exists (
      select 1
      from public.bookings b
      where b.appointment_id = new.id
        and b.atelier_id = new.atelier_id
        and b.status in ('held', 'confirmed')
    ) then
      raise exception using errcode = '23514', message = 'appointment_has_live_booking';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_guard_booking_status on public.appointments;
create trigger appointments_guard_booking_status
before update of status on public.appointments
for each row execute function public.guard_appointment_booking_status();

create or replace function public.sync_appointment_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.appointment_id is null or old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    update public.appointments
       set status = 'confirmed'
     where id = new.appointment_id
       and atelier_id = new.atelier_id
       and status = 'pending';
  elsif new.status = 'cancelled' then
    -- A cancelled booking frees its original request for a new slot.
    update public.appointments
       set status = 'pending'
     where id = new.appointment_id
       and atelier_id = new.atelier_id
       and status = 'confirmed';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_sync_appointment_status on public.bookings;
create trigger bookings_sync_appointment_status
after update of status on public.bookings
for each row execute function public.sync_appointment_booking_status();

revoke all on function public.guard_appointment_booking_status() from public, anon, authenticated;
revoke all on function public.sync_appointment_booking_status() from public, anon, authenticated;

-- A live atelier has no seed resources. Let its owner create a resource and
-- its weekly availability in one transaction so the booking screen can be
-- configured without direct database access or a partially-created resource.
create or replace function public.create_booking_resource(
  p_atelier_id uuid,
  p_kind text,
  p_display_name text,
  p_timezone text,
  p_starts_at time,
  p_ends_at time,
  p_weekdays smallint[] default array[1, 2, 3, 4, 5, 6]::smallint[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_resource public.booking_resources%rowtype;
  v_weekday smallint;
begin
  if v_caller is null or not exists (
    select 1
    from public.members m
    where m.id = v_caller
      and m.atelier_id = p_atelier_id
      and m.active
      and m.role = 'owner'
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if p_kind is null or p_kind not in ('cutter', 'fitter', 'fitting_room', 'workshop')
     or p_display_name is null or btrim(p_display_name) = ''
     or p_timezone is null
     or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
     or p_weekdays is null or cardinality(p_weekdays) = 0
     or exists (select 1 from unnest(p_weekdays) d where d < 0 or d > 6)
     or cardinality(p_weekdays) <> (select count(distinct d) from unnest(p_weekdays) d)
     or not exists (select 1 from pg_catalog.pg_timezone_names t where t.name = p_timezone) then
    return jsonb_build_object('error', 'invalid_resource_schedule');
  end if;

  insert into public.booking_resources (atelier_id, kind, display_name, timezone)
  values (p_atelier_id, p_kind, btrim(p_display_name), p_timezone)
  returning * into v_resource;

  foreach v_weekday in array p_weekdays loop
    insert into public.resource_availability_rules (
      atelier_id, resource_id, weekday, starts_at, ends_at
    ) values (
      p_atelier_id, v_resource.id, v_weekday, p_starts_at, p_ends_at
    );
  end loop;

  return jsonb_build_object(
    'id', v_resource.id,
    'atelier_id', v_resource.atelier_id,
    'kind', v_resource.kind,
    'display_name', v_resource.display_name,
    'timezone', v_resource.timezone
  );
end;
$$;

revoke all on function public.create_booking_resource(uuid, text, text, text, time, time, smallint[])
  from public, anon;
grant execute on function public.create_booking_resource(uuid, text, text, text, time, time, smallint[])
  to authenticated;
