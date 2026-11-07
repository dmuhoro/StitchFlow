-- ============================================================================
-- SPRINT 3B — STAFF BOOKING SLICE (AVAILABILITY, LINKED REQUESTS, SWEEP)
-- ----------------------------------------------------------------------------
-- Forward-only. This migration builds the staff-facing half of the booking
-- engine on top of 20261107120000_booking_engine.sql:
--
--   * a nullable `bookings.appointment_id` link, tenant-scoped by a composite
--     foreign key so a booking can never point at another atelier's request
--     (appointments policies are NOT touched);
--   * `get_availability(...)`, an authenticated-only read RPC that returns
--     free slots from the availability rules, minus blackouts, live holds and
--     confirmed bookings;
--   * `expire_stale_holds()` with no arguments, callable by a scheduler as
--     `service_role` without pg_cron being installed or referenced here;
--   * a replacement `hold_slot(...)` that accepts an originating appointment,
--     maps constraint violations to explicit error tokens, and rotates the
--     hold token on an idempotent replay instead of returning the original.
--
-- Honest boundaries, repeated in `docs/evidence/2026-11-07-booking-staff-slice.md`:
--   * `appointments` remains the public request inbox. Its policies, including
--     `appointments_public_insert`, are unchanged. Only the staff confirmation
--     path moves to `bookings`.
--   * Availability is a read-only projection. The GiST exclusion constraint in
--     `bookings_no_overlap` remains the only authority on overlap.
--   * There is still no scheduled job in this repository. The no-argument
--     expiry RPC is the hook a trusted scheduler calls; the migration does not
--     install or depend on pg_cron.
--   * Capacity greater than one is still not implemented.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BOOKING → ORIGINATING REQUEST LINK
-- ----------------------------------------------------------------------------
-- The composite key lets the foreign key prove that the appointment belongs to
-- the same atelier as the booking. `id` is already the primary key; this unique
-- index only makes the composite reference legal and is not a second identity.
create unique index if not exists appointments_id_atelier_unique
  on public.appointments (id, atelier_id);

alter table public.bookings
  add column if not exists appointment_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_appointment_tenant_fk'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_appointment_tenant_fk
      foreign key (appointment_id, atelier_id)
      references public.appointments (id, atelier_id)
      on delete set null (appointment_id);
  end if;
end $$;

-- One live booking per request. A cancelled or expired booking releases the
-- request so staff can re-confirm it without deleting history.
create unique index if not exists bookings_appointment_live_unique
  on public.bookings (appointment_id)
  where appointment_id is not null
    and status in ('held', 'confirmed');

create index if not exists idx_bookings_appointment
  on public.bookings (appointment_id);

comment on column public.bookings.appointment_id is
  'Originating fitting request. Composite FK keeps the link inside one atelier; one live booking per request.';

-- ----------------------------------------------------------------------------
-- 2. AVAILABILITY READ RPC
-- ----------------------------------------------------------------------------
-- Returns local availability windows projected as UTC ISO-8601 slots. Rules are
-- wall-clock windows in the resource timezone; blackouts and live reservations
-- subtract from them. Expired holds are treated as free because only a held
-- row with a future expiry blocks a slot.
create or replace function public.get_availability(
  p_atelier_id uuid,
  p_resource_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_slot_minutes integer default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_resource public.booking_resources%rowtype;
  v_slots jsonb;
begin
  if v_caller is null then
    return jsonb_build_object('error', 'authentication_required');
  end if;

  if p_atelier_id is null or p_resource_id is null or p_from is null or p_to is null then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  if not isfinite(p_from) or not isfinite(p_to) or p_to <= p_from then
    return jsonb_build_object('error', 'invalid_time_range');
  end if;

  if p_slot_minutes is null or p_slot_minutes < 15 or p_slot_minutes > 480 then
    return jsonb_build_object('error', 'invalid_slot_minutes');
  end if;

  -- Fail closed on an unbounded query: an authenticated caller must not be
  -- able to ask the database to materialise years of slots.
  if p_to - p_from > interval '31 days' then
    return jsonb_build_object('error', 'range_too_large');
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = v_caller
      and m.active
      and m.atelier_id = p_atelier_id
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select *
    into v_resource
  from public.booking_resources r
  where r.id = p_resource_id
    and r.atelier_id = p_atelier_id
    and r.active;

  if not found then
    return jsonb_build_object('error', 'resource_unavailable');
  end if;

  with bounds as (
    select
      (p_from at time zone v_resource.timezone)::date as from_date,
      (p_to at time zone v_resource.timezone)::date as to_date
  ),
  days as (
    select d::date as local_date
    from bounds b
    cross join lateral generate_series(
      b.from_date::timestamp,
      b.to_date::timestamp,
      interval '1 day'
    ) as d
  ),
  windows as (
    select d.local_date, r.starts_at, r.ends_at
    from days d
    join public.resource_availability_rules r
      on r.atelier_id = p_atelier_id
     and r.resource_id = p_resource_id
     and r.weekday = extract(dow from d.local_date)::smallint
     and (r.valid_from is null or d.local_date >= r.valid_from)
     and (r.valid_to is null or d.local_date <= r.valid_to)
  ),
  candidates as (
    select
      (w.local_date::timestamp + w.starts_at + make_interval(mins => step_min.step_min)) at time zone v_resource.timezone as slot_start,
      (w.local_date::timestamp + w.starts_at + make_interval(mins => step_min.step_min) + make_interval(mins => p_slot_minutes))
        at time zone v_resource.timezone as slot_end
    from windows w
    cross join lateral generate_series(
      0,
      (extract(epoch from (w.ends_at - w.starts_at)) / 60)::int - p_slot_minutes,
      p_slot_minutes
    ) as step_min
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'start', to_char(c.slot_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'end', to_char(c.slot_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      order by c.slot_start
    ),
    '[]'::jsonb
  )
  into v_slots
  from candidates c
  where c.slot_start >= p_from
    and c.slot_end <= p_to
    and c.slot_start >= now()
    and not exists (
      select 1
      from public.blackout_dates b
      where b.atelier_id = p_atelier_id
        and (b.resource_id is null or b.resource_id = p_resource_id)
        and b.during && tstzrange(c.slot_start, c.slot_end, '[)')
    )
    and not exists (
      select 1
      from public.bookings bk
      where bk.atelier_id = p_atelier_id
        and bk.resource_id = p_resource_id
        and bk.during && tstzrange(c.slot_start, c.slot_end, '[)')
        and (
          bk.status = 'confirmed'
          or (bk.status = 'held' and bk.hold_expires_at > now())
        )
    );

  return jsonb_build_object(
    'atelier_id', p_atelier_id,
    'resource_id', p_resource_id,
    'timezone', v_resource.timezone,
    'slot_minutes', p_slot_minutes,
    'from', to_char(p_from at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'to', to_char(p_to at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', v_slots
  );
end;
$$;

revoke all on function public.get_availability(uuid, uuid, timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.get_availability(uuid, uuid, timestamptz, timestamptz, integer)
  to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. SCHEDULER-FRIENDLY EXPIRY SWEEP
-- ----------------------------------------------------------------------------
-- The two-argument helper stays RPC-internal. This no-argument wrapper sweeps
-- every tenant and is granted only to service_role, the role a trusted
-- scheduler (pg_cron, an edge cron, or an operator) uses. The migration neither
-- installs nor references pg_cron.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
     set status = 'expired'
   where status = 'held'
     and hold_expires_at <= now();

  get diagnostics v_count = row_count;

  -- A token for a booking that can no longer be confirmed is dead weight in
  -- the replay ledger. Drop it; the ledger row itself is retained for audit.
  update public.idempotency_keys k
     set result = k.result - 'hold_token'
    from public.bookings b
   where k.booking_id = b.id
     and k.scope = 'hold_slot'
     and b.status in ('confirmed', 'cancelled', 'expired')
     and k.result ? 'hold_token';

  return v_count;
end;
$$;

revoke all on function public.expire_stale_holds() from public, anon, authenticated;
grant execute on function public.expire_stale_holds() to service_role;

-- ----------------------------------------------------------------------------
-- 4. HOLD RPC — APPOINTMENT LINK AND ROTATING REPLAY
-- ----------------------------------------------------------------------------
-- The thirteen-argument signature supersedes the twelve-argument function. All
-- existing positional calls remain valid because the new argument is last and
-- defaults to null.
drop function if exists public.hold_slot(
  uuid, uuid, tstzrange, text, uuid, text, text, text, text, text, text, integer
);

create or replace function public.hold_slot(
  p_atelier_id uuid,
  p_resource_id uuid,
  p_during tstzrange,
  p_service_type text,
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_client_email text default null,
  p_cultural_occasion text default null,
  p_notes text default null,
  p_idempotency_key text default null,
  p_hold_minutes integer default 10,
  p_appointment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_role text;
  v_resource public.booking_resources%rowtype;
  v_appointment public.appointments%rowtype;
  v_during tstzrange;
  v_window_error text;
  v_payload_hash text;
  v_existing public.idempotency_keys%rowtype;
  v_booking public.bookings%rowtype;
  v_token text;
  v_expires timestamptz;
  v_result jsonb;
  v_constraint text;
begin
  if v_caller is null then
    return jsonb_build_object('error', 'authentication_required');
  end if;

  if p_atelier_id is null
     or p_resource_id is null
     or p_during is null
     or p_service_type is null
     or btrim(p_service_type) = '' then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  if p_hold_minutes is null or p_hold_minutes < 1 or p_hold_minutes > 60 then
    return jsonb_build_object('error', 'invalid_hold_window');
  end if;

  if p_idempotency_key is not null
     and (char_length(p_idempotency_key) < 1 or char_length(p_idempotency_key) > 200) then
    return jsonb_build_object('error', 'invalid_idempotency_key');
  end if;

  -- Tenant check. The caller must be an active member of the target atelier.
  select m.role
    into v_role
  from public.members m
  where m.id = v_caller
    and m.active
    and m.atelier_id = p_atelier_id;

  if v_role is null then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if isempty(p_during) then
    return jsonb_build_object('error', 'invalid_time_range');
  end if;

  v_during := tstzrange(lower(p_during), upper(p_during), '[)');

  -- Bind the booking to its originating public request. The composite key in
  -- the table proves tenancy; this lookup gives the caller a precise error and
  -- lets a staff confirmation inherit the request's contact snapshot.
  if p_appointment_id is not null then
    select *
      into v_appointment
    from public.appointments a
    where a.id = p_appointment_id
      and a.atelier_id = p_atelier_id
    for share;

    if not found then
      return jsonb_build_object('error', 'appointment_not_found');
    end if;

    if p_client_id is null then
      p_client_id := v_appointment.client_id;
    end if;
    if p_client_name is null or btrim(p_client_name) = '' then
      p_client_name := v_appointment.client_name;
    end if;
    if p_client_phone is null or btrim(p_client_phone) = '' then
      p_client_phone := v_appointment.client_phone;
    end if;
    if p_client_email is null or btrim(p_client_email) = '' then
      p_client_email := v_appointment.client_email;
    end if;
    if p_cultural_occasion is null or btrim(p_cultural_occasion) = '' then
      p_cultural_occasion := v_appointment.cultural_occasion;
    end if;
    if p_notes is null or btrim(p_notes) = '' then
      p_notes := v_appointment.notes;
    end if;
  end if;

  -- Role limits: a client may only reserve for themselves. Staff may reserve
  -- for a tenant member or for a contact-only guest.
  if v_role = 'client' then
    if p_client_id is distinct from v_caller then
      return jsonb_build_object('error', 'forbidden');
    end if;
  else
    if p_client_id is not null and not exists (
      select 1
      from public.members m
      where m.id = p_client_id
        and m.active
        and m.atelier_id = p_atelier_id
    ) then
      return jsonb_build_object('error', 'client_not_in_atelier');
    end if;

    if p_client_id is null
       and (p_client_name is null or btrim(p_client_name) = ''
            or p_client_phone is null or btrim(p_client_phone) = '') then
      return jsonb_build_object('error', 'guest_contact_required');
    end if;
  end if;

  -- The caller identity is part of the hash: knowing another staff member's
  -- key is not enough to recover their hold token.
  v_payload_hash := md5(jsonb_build_object(
    'caller_id', v_caller,
    'atelier_id', p_atelier_id,
    'resource_id', p_resource_id,
    'during', v_during::text,
    'service_type', p_service_type,
    'client_id', p_client_id,
    'client_name', p_client_name,
    'client_phone', p_client_phone,
    'client_email', p_client_email,
    'cultural_occasion', p_cultural_occasion,
    'notes', p_notes,
    'hold_minutes', p_hold_minutes,
    'appointment_id', p_appointment_id
  )::text);

  -- Replay before validating live availability: an idempotent retry must return
  -- the original booking even if the clock or the rule set has moved on.
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(p_atelier_id::text || ':hold_slot:' || p_idempotency_key, 0)
    );

    select *
      into v_existing
    from public.idempotency_keys k
    where k.atelier_id = p_atelier_id
      and k.scope = 'hold_slot'
      and k.idempotency_key = p_idempotency_key;

    if found then
      if v_existing.payload_hash <> v_payload_hash then
        return jsonb_build_object('error', 'idempotency_key_conflict');
      end if;

      -- Replay rotates the token. The ledger therefore holds at most one live
      -- token, and a leaked historical result cannot confirm the booking.
      select *
        into v_booking
      from public.bookings b
      where b.id = v_existing.booking_id
      for update;

      if not found then
        return jsonb_build_object('error', 'booking_not_found');
      end if;

      if v_booking.status = 'held' and v_booking.hold_expires_at > now() then
        v_token := replace(gen_random_uuid()::text, '-', '')
                   || replace(gen_random_uuid()::text, '-', '');

        update public.bookings
           set hold_token_hash = md5(v_token)
         where id = v_booking.id
        returning * into v_booking;

        v_result := jsonb_build_object(
          'booking_id', v_booking.id,
          'atelier_id', v_booking.atelier_id,
          'resource_id', v_booking.resource_id,
          'appointment_id', v_booking.appointment_id,
          'status', v_booking.status,
          'during', v_booking.during::text,
          'hold_token', v_token,
          'hold_expires_at', v_booking.hold_expires_at,
          'replayed', true
        );

        update public.idempotency_keys k
           set result = v_result
         where k.atelier_id = p_atelier_id
           and k.scope = 'hold_slot'
           and k.idempotency_key = p_idempotency_key;

        return v_result;
      end if;

      if v_booking.status = 'held' then
        update public.bookings
           set status = 'expired'
         where id = v_booking.id;
        return jsonb_build_object('error', 'hold_expired');
      end if;

      -- Confirmed/cancelled/expired: return the current booking state without a
      -- token. The booking row is authoritative; the ledger may still describe
      -- the moment of the hold.
      v_result := jsonb_build_object(
        'booking_id', v_booking.id,
        'atelier_id', v_booking.atelier_id,
        'resource_id', v_booking.resource_id,
        'appointment_id', v_booking.appointment_id,
        'status', v_booking.status,
        'during', v_booking.during::text,
        'hold_token', null,
        'hold_expires_at', v_booking.hold_expires_at,
        'replayed', true
      );

      update public.idempotency_keys k
         set result = v_result
       where k.atelier_id = p_atelier_id
         and k.scope = 'hold_slot'
         and k.idempotency_key = p_idempotency_key;

      return v_result;
    end if;
  end if;

  select *
    into v_resource
  from public.booking_resources r
  where r.id = p_resource_id
    and r.atelier_id = p_atelier_id
    and r.active;

  if not found then
    return jsonb_build_object('error', 'resource_unavailable');
  end if;

  v_window_error := public.booking_window_error(
    p_atelier_id, p_resource_id, v_resource.timezone, v_during
  );
  if v_window_error is not null then
    return jsonb_build_object('error', v_window_error);
  end if;

  -- Serialize writers per resource so the expiry sweep and the insert see one
  -- state. The GiST constraint remains the authority if this lock is removed.
  perform pg_advisory_xact_lock(hashtextextended(p_resource_id::text, 0));

  perform public.expire_stale_holds(p_atelier_id, p_resource_id);

  if p_appointment_id is not null then
    if v_appointment.status <> 'pending' then
      return jsonb_build_object('error', 'appointment_not_pending');
    end if;

    if exists (
      select 1
      from public.bookings b
      where b.appointment_id = p_appointment_id
        and b.status in ('held', 'confirmed')
    ) then
      return jsonb_build_object('error', 'appointment_already_booked');
    end if;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '')
             || replace(gen_random_uuid()::text, '-', '');
  v_expires := least(
    now() + make_interval(mins => p_hold_minutes),
    lower(v_during)
  );

  begin
    insert into public.bookings (
      atelier_id, resource_id, during, status, client_id,
      guest_name, guest_phone, guest_email,
      service_type, cultural_occasion, notes, appointment_id,
      idempotency_key, hold_token_hash, hold_expires_at
    ) values (
      p_atelier_id, p_resource_id, v_during, 'held', p_client_id,
      p_client_name, p_client_phone, p_client_email,
      p_service_type, p_cultural_occasion, p_notes, p_appointment_id,
      p_idempotency_key, md5(v_token), v_expires
    )
    returning * into v_booking;
  exception
    when exclusion_violation then
      return jsonb_build_object('error', 'slot_unavailable');
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_appointment_live_unique' then
        return jsonb_build_object('error', 'appointment_already_booked');
      end if;
      if v_constraint = 'bookings_hold_idempotency_key_unique' then
        return jsonb_build_object('error', 'idempotency_key_conflict');
      end if;
      raise;
  end;

  v_result := jsonb_build_object(
    'booking_id', v_booking.id,
    'atelier_id', v_booking.atelier_id,
    'resource_id', v_booking.resource_id,
    'appointment_id', v_booking.appointment_id,
    'status', v_booking.status,
    'during', v_booking.during::text,
    'hold_token', v_token,
    'hold_expires_at', v_booking.hold_expires_at,
    'replayed', false
  );

  if p_idempotency_key is not null then
    insert into public.idempotency_keys (
      atelier_id, scope, idempotency_key, payload_hash, result, booking_id
    ) values (
      p_atelier_id, 'hold_slot', p_idempotency_key, v_payload_hash, v_result, v_booking.id
    )
    on conflict (atelier_id, scope, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

revoke all on function public.hold_slot(
  uuid, uuid, tstzrange, text, uuid, text, text, text, text, text, text, integer, uuid
) from public, anon;
grant execute on function public.hold_slot(
  uuid, uuid, tstzrange, text, uuid, text, text, text, text, text, text, integer, uuid
) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. SCRUB DEAD TOKENS WHEN A HOLD ENDS
-- ----------------------------------------------------------------------------
-- Confirmation and cancellation make the hold token useless. Removing it from
-- the ledger means a replay of a finished hold can never hand back a token.
create or replace function public.confirm_booking(p_hold_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_role text;
begin
  if v_caller is null then
    return jsonb_build_object('error', 'authentication_required');
  end if;

  if p_hold_token is null or btrim(p_hold_token) = '' then
    return jsonb_build_object('error', 'invalid_hold_token');
  end if;

  select *
    into v_booking
  from public.bookings b
  where b.hold_token_hash = md5(p_hold_token)
  for update;

  if not found then
    return jsonb_build_object('error', 'invalid_hold_token');
  end if;

  select m.role
    into v_role
  from public.members m
  where m.id = v_caller
    and m.active
    and m.atelier_id = v_booking.atelier_id;

  if v_role is null then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if v_role = 'client' and v_booking.client_id is distinct from v_caller then
    return jsonb_build_object('error', 'forbidden');
  end if;

  -- Replaying a confirmation returns the same booking; it never creates one.
  if v_booking.status = 'confirmed' then
    return jsonb_build_object(
      'booking_id', v_booking.id,
      'status', v_booking.status,
      'during', v_booking.during::text,
      'hold_expires_at', v_booking.hold_expires_at
    );
  end if;

  if v_booking.status = 'cancelled' then
    return jsonb_build_object('error', 'booking_cancelled');
  end if;

  if v_booking.status = 'expired'
     or (v_booking.status = 'held' and v_booking.hold_expires_at <= now()) then
    if v_booking.status = 'held' then
      update public.bookings
         set status = 'expired'
       where id = v_booking.id;
    end if;
    return jsonb_build_object('error', 'hold_expired');
  end if;

  begin
    update public.bookings
       set status = 'confirmed'
     where id = v_booking.id
    returning * into v_booking;
  exception
    when exclusion_violation then
      return jsonb_build_object('error', 'slot_unavailable');
  end;

  update public.idempotency_keys k
     set result = k.result - 'hold_token'
   where k.booking_id = v_booking.id
     and k.scope = 'hold_slot'
     and k.result ? 'hold_token';

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'during', v_booking.during::text,
    'hold_expires_at', v_booking.hold_expires_at
  );
end;
$$;

revoke all on function public.confirm_booking(text) from public, anon;
grant execute on function public.confirm_booking(text) to authenticated, service_role;

create or replace function public.cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_role text;
begin
  if v_caller is null then
    return jsonb_build_object('error', 'authentication_required');
  end if;

  if p_booking_id is null then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  select *
    into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  -- A cross-tenant caller receives the same answer as a missing row; the
  -- lookup must not disclose that another tenant's booking exists.
  if not found then
    return jsonb_build_object('error', 'booking_not_found');
  end if;

  select m.role
    into v_role
  from public.members m
  where m.id = v_caller
    and m.active
    and m.atelier_id = v_booking.atelier_id;

  if v_role is null then
    return jsonb_build_object('error', 'booking_not_found');
  end if;

  if v_role = 'client' and v_booking.client_id is distinct from v_caller then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if v_booking.status = 'cancelled' then
    return jsonb_build_object(
      'booking_id', v_booking.id,
      'status', v_booking.status,
      'during', v_booking.during::text
    );
  end if;

  if v_booking.status = 'expired' then
    return jsonb_build_object('error', 'booking_expired');
  end if;

  update public.bookings
     set status = 'cancelled'
   where id = v_booking.id
  returning * into v_booking;

  update public.idempotency_keys k
     set result = k.result - 'hold_token'
   where k.booking_id = v_booking.id
     and k.scope = 'hold_slot'
     and k.result ? 'hold_token';

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'during', v_booking.during::text
  );
end;
$$;

revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. COMMENTS
-- ----------------------------------------------------------------------------
comment on function public.get_availability(uuid, uuid, timestamptz, timestamptz, integer) is
  'Authenticated, tenant-scoped free-slot projection in UTC ISO-8601. Expired holds are free; rules, blackouts and live bookings subtract.';
comment on function public.expire_stale_holds() is
  'Global stale-hold sweep for a trusted scheduler (service_role only). Does not require pg_cron.';
comment on function public.hold_slot(
  uuid, uuid, tstzrange, text, uuid, text, text, text, text, text, text, integer, uuid
) is
  'Exclusive hold. Optional originating appointment; replay rotates the hold token and the ledger retains only the current live token.';
