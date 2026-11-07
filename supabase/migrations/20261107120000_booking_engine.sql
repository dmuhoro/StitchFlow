-- ============================================================================
-- SPRINT 3 — BOOKING ENGINE (DATABASE LAYER ONLY)
-- ----------------------------------------------------------------------------
-- Expand-only. This migration adds a resource model, availability rules,
-- blackout dates, an exclusive reservation table with a GiST exclusion
-- constraint, a replay ledger, and four RPCs. It does not alter or retire
-- `public.appointments` or any of its policies.
--
-- ADR-009 was PROPOSED when this migration was written. The database layer is
-- implemented; product approval of the ADR is still an owner decision. Naming
-- follows the delivery brief: `hold_slot` / `slot_unavailable`.
--
-- Honest boundary, repeated in docs/evidence/2026-11-07-booking-engine.md:
--   * `appointments` remains a second, unguarded booking store. Its
--     `appointments_public_insert` policy still accepts overlapping anonymous
--     requests. Retiring it is ADR-009 §8 and is out of scope here.
--   * Capacity > 1 (group workshops / `booking_slots`) is not implemented.
--     `booking_resources.capacity` is constrained to 1 so the schema cannot
--     advertise a capacity it does not enforce.
--   * Guest hold/confirm calls require an authenticated staff member until the
--     edge-function guest boundary in ADR-009 §8 exists.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
-- btree_gist supplies the `uuid WITH =` operator class required by the mixed
-- GiST exclusion constraint below.
create extension if not exists btree_gist;

-- ----------------------------------------------------------------------------
-- 2. RESOURCES
-- ----------------------------------------------------------------------------
create table if not exists public.booking_resources (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.ateliers(id) on delete cascade,
  kind text not null check (kind in ('cutter', 'fitter', 'fitting_room', 'workshop')),
  display_name text not null check (btrim(display_name) <> ''),
  -- Fail closed: group capacity requires booking_slots, which is not in this
  -- layer. A check prevents a resource from claiming capacity it cannot honour.
  capacity integer not null default 1 check (capacity = 1),
  timezone text not null default 'UTC',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  -- Redundant with the primary key, but it lets child tables carry a composite
  -- foreign key so a resource reference can never cross a tenant boundary.
  unique (id, atelier_id)
);

create index if not exists idx_booking_resources_atelier
  on public.booking_resources (atelier_id, active);

drop trigger if exists booking_resources_set_updated_at on public.booking_resources;
create trigger booking_resources_set_updated_at
before update on public.booking_resources
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. AVAILABILITY RULES
-- ----------------------------------------------------------------------------
-- `weekday` follows PostgreSQL extract(dow): 0 = Sunday … 6 = Saturday. Times
-- are wall-clock times in the resource's timezone, not UTC.
create table if not exists public.resource_availability_rules (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.ateliers(id) on delete cascade,
  resource_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint availability_rule_window_valid check (ends_at > starts_at),
  constraint availability_rule_validity_valid check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  ),
  constraint availability_rule_resource_tenant_fk
    foreign key (resource_id, atelier_id)
    references public.booking_resources (id, atelier_id)
    on delete cascade
);

create index if not exists idx_availability_rules_resource_weekday
  on public.resource_availability_rules (resource_id, weekday, starts_at);

drop trigger if exists availability_rules_set_updated_at on public.resource_availability_rules;
create trigger availability_rules_set_updated_at
before update on public.resource_availability_rules
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. BLACKOUT DATES
-- ----------------------------------------------------------------------------
-- A null resource_id means the whole atelier is closed for the range.
create table if not exists public.blackout_dates (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.ateliers(id) on delete cascade,
  resource_id uuid,
  during tstzrange not null,
  reason text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint blackout_range_valid check (
    not isempty(during)
    and not lower_inf(during)
    and not upper_inf(during)
    and lower(during) < upper(during)
  ),
  constraint blackout_resource_tenant_fk
    foreign key (resource_id, atelier_id)
    references public.booking_resources (id, atelier_id)
    on delete cascade
);

create index if not exists idx_blackout_dates_atelier
  on public.blackout_dates (atelier_id, during);
create index if not exists idx_blackout_dates_resource
  on public.blackout_dates (resource_id, during);

drop trigger if exists blackout_dates_set_updated_at on public.blackout_dates;
create trigger blackout_dates_set_updated_at
before update on public.blackout_dates
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. BOOKINGS
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid not null references public.ateliers(id) on delete cascade,
  resource_id uuid not null,
  during tstzrange not null,
  status text not null default 'held'
    check (status in ('held', 'confirmed', 'cancelled', 'expired')),
  client_id uuid references public.members(id) on delete set null,
  guest_name text,
  guest_phone text,
  guest_email text,
  service_type text not null,
  cultural_occasion text,
  notes text,
  -- The key that produced this hold. Reschedule keys live only in the replay
  -- ledger, so a booking keeps the original hold key for diagnostics.
  idempotency_key text,
  -- Only the hash of the hold token is stored on the booking row.
  hold_token_hash text,
  hold_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint booking_range_valid check (
    not isempty(during)
    and not lower_inf(during)
    and not upper_inf(during)
    and lower(during) < upper(during)
  ),
  constraint booking_hold_fields_present check (
    status <> 'held'
    or (hold_token_hash is not null and hold_expires_at is not null)
  ),
  constraint booking_resource_tenant_fk
    foreign key (resource_id, atelier_id)
    references public.booking_resources (id, atelier_id)
    on delete cascade
);

-- The final authority: two live reservations for the same resource may never
-- overlap. `held` rows count as live so a checkout race cannot double-sell.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    resource_id with =,
    during with &&
  ) where (status in ('held', 'confirmed'));

create unique index if not exists bookings_hold_token_hash_unique
  on public.bookings (hold_token_hash)
  where hold_token_hash is not null;

create unique index if not exists bookings_hold_idempotency_key_unique
  on public.bookings (atelier_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_bookings_atelier_status
  on public.bookings (atelier_id, status, during);
create index if not exists idx_bookings_client
  on public.bookings (client_id, during);
create index if not exists idx_bookings_resource_status
  on public.bookings (resource_id, status, hold_expires_at);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Every state transition is appended to the existing audit trail.
drop trigger if exists audit_bookings_trigger on public.bookings;
create trigger audit_bookings_trigger
after insert or update or delete on public.bookings
for each row execute function public.write_audit_log();

-- ----------------------------------------------------------------------------
-- 6. IDEMPOTENCY LEDGER
-- ----------------------------------------------------------------------------
-- The ledger is RPC-internal. RLS is enabled with no policies, so a client
-- cannot read another caller's replay state. It retains the original result,
-- including a hold token, because replaying a hold without its token would
-- leave the slot reserved and unconfirmable. Booking rows still store only the
-- token hash.
create table if not exists public.idempotency_keys (
  atelier_id uuid not null references public.ateliers(id) on delete cascade,
  scope text not null check (scope in ('hold_slot', 'reschedule_booking')),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  payload_hash text not null,
  result jsonb not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (atelier_id, scope, idempotency_key)
);

create index if not exists idx_idempotency_keys_booking
  on public.idempotency_keys (booking_id);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.booking_resources enable row level security;
alter table public.resource_availability_rules enable row level security;
alter table public.blackout_dates enable row level security;
alter table public.bookings enable row level security;
alter table public.idempotency_keys enable row level security;

-- RESOURCES: members read active resources; owners see and manage everything.
create policy booking_resources_member_read on public.booking_resources
  for select to authenticated using (
    active and atelier_id = public.current_member_atelier_id()
  );

create policy booking_resources_owner_read on public.booking_resources
  for select to authenticated using (public.is_atelier_owner(atelier_id));

create policy booking_resources_owner_insert on public.booking_resources
  for insert to authenticated with check (public.is_atelier_owner(atelier_id));

create policy booking_resources_owner_update on public.booking_resources
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy booking_resources_owner_delete on public.booking_resources
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- AVAILABILITY RULES: tenant members may read; only owners may write.
create policy availability_rules_member_read on public.resource_availability_rules
  for select to authenticated using (
    atelier_id = public.current_member_atelier_id()
  );

create policy availability_rules_owner_insert on public.resource_availability_rules
  for insert to authenticated with check (public.is_atelier_owner(atelier_id));

create policy availability_rules_owner_update on public.resource_availability_rules
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy availability_rules_owner_delete on public.resource_availability_rules
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- BLACKOUT DATES: tenant members may read; only owners may write.
create policy blackout_dates_member_read on public.blackout_dates
  for select to authenticated using (
    atelier_id = public.current_member_atelier_id()
  );

create policy blackout_dates_owner_insert on public.blackout_dates
  for insert to authenticated with check (public.is_atelier_owner(atelier_id));

create policy blackout_dates_owner_update on public.blackout_dates
  for update to authenticated
  using (public.is_atelier_owner(atelier_id))
  with check (public.is_atelier_owner(atelier_id));

create policy blackout_dates_owner_delete on public.blackout_dates
  for delete to authenticated using (public.is_atelier_owner(atelier_id));

-- BOOKINGS: read-only through RLS. There is deliberately no INSERT/UPDATE/
-- DELETE policy: every mutation goes through a SECURITY DEFINER RPC so the
-- exclusion constraint, tenant check, expiry sweep, and idempotency replay are
-- never bypassed by a direct PostgREST write.
create policy bookings_staff_read on public.bookings
  for select to authenticated using (public.is_atelier_staff(atelier_id));

create policy bookings_client_read_own on public.bookings
  for select to authenticated using (
    client_id = (select auth.uid())
    and public.is_atelier_member(atelier_id)
  );

-- IDEMPOTENCY KEYS: no policy. RLS denies every client role; only the definer
-- RPCs may read or write the ledger.

-- ----------------------------------------------------------------------------
-- 8. INTERNAL HELPERS (not callable by clients)
-- ----------------------------------------------------------------------------
create or replace function public.expire_stale_holds(
  p_atelier_id uuid,
  p_resource_id uuid
)
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
   where atelier_id = p_atelier_id
     and resource_id = p_resource_id
     and status = 'held'
     and hold_expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_holds(uuid, uuid) from public, anon, authenticated;

-- Returns null when the range is bookable, or a stable error token otherwise.
create or replace function public.booking_window_error(
  p_atelier_id uuid,
  p_resource_id uuid,
  p_timezone text,
  p_during tstzrange
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start_local timestamp;
  v_end_local timestamp;
begin
  if p_during is null
     or isempty(p_during)
     or lower_inf(p_during)
     or upper_inf(p_during)
     or lower(p_during) >= upper(p_during) then
    return 'invalid_time_range';
  end if;

  if lower(p_during) < now() then
    return 'slot_in_past';
  end if;

  if upper(p_during) - lower(p_during) > interval '12 hours' then
    return 'slot_too_long';
  end if;

  begin
    v_start_local := lower(p_during) at time zone p_timezone;
    v_end_local := upper(p_during) at time zone p_timezone;
  exception
    when invalid_parameter_value then
      return 'invalid_resource_timezone';
  end;

  -- A reservation must start and end on one local calendar day. Overnight
  -- windows are deliberately not guessed at in this layer.
  if v_start_local::date <> v_end_local::date then
    return 'outside_availability';
  end if;

  if not exists (
    select 1
    from public.resource_availability_rules r
    where r.atelier_id = p_atelier_id
      and r.resource_id = p_resource_id
      and r.weekday = extract(dow from v_start_local)::smallint
      and v_start_local::time >= r.starts_at
      and v_end_local::time <= r.ends_at
      and (r.valid_from is null or v_start_local::date >= r.valid_from)
      and (r.valid_to is null or v_start_local::date <= r.valid_to)
  ) then
    return 'outside_availability';
  end if;

  if exists (
    select 1
    from public.blackout_dates b
    where b.atelier_id = p_atelier_id
      and (b.resource_id is null or b.resource_id = p_resource_id)
      and b.during && p_during
  ) then
    return 'blackout';
  end if;

  return null;
end;
$$;

revoke all on function public.booking_window_error(uuid, uuid, text, tstzrange)
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. RPCS
-- ----------------------------------------------------------------------------
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
  p_hold_minutes integer default 10
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
  v_during tstzrange;
  v_window_error text;
  v_payload_hash text;
  v_existing public.idempotency_keys%rowtype;
  v_booking public.bookings%rowtype;
  v_token text;
  v_expires timestamptz;
  v_result jsonb;
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

  if isempty(p_during) then
    return jsonb_build_object('error', 'invalid_time_range');
  end if;

  v_during := tstzrange(lower(p_during), upper(p_during), '[)');

  v_payload_hash := md5(jsonb_build_object(
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
    'hold_minutes', p_hold_minutes
  )::text);

  -- Replay before validating live availability: an idempotent retry must return
  -- the original result even if the clock or the rule set has moved on.
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
      if v_existing.payload_hash = v_payload_hash then
        return v_existing.result;
      end if;
      return jsonb_build_object('error', 'idempotency_key_conflict');
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
      service_type, cultural_occasion, notes,
      idempotency_key, hold_token_hash, hold_expires_at
    ) values (
      p_atelier_id, p_resource_id, v_during, 'held', p_client_id,
      p_client_name, p_client_phone, p_client_email,
      p_service_type, p_cultural_occasion, p_notes,
      p_idempotency_key, md5(v_token), v_expires
    )
    returning * into v_booking;
  exception
    when exclusion_violation then
      return jsonb_build_object('error', 'slot_unavailable');
    when unique_violation then
      -- The unique index on (atelier_id, idempotency_key) is the last line of
      -- defence if two writers ever bypass the advisory lock.
      return jsonb_build_object('error', 'idempotency_key_conflict');
  end;

  v_result := jsonb_build_object(
    'booking_id', v_booking.id,
    'atelier_id', v_booking.atelier_id,
    'resource_id', v_booking.resource_id,
    'status', v_booking.status,
    'during', v_booking.during::text,
    'hold_token', v_token,
    'hold_expires_at', v_booking.hold_expires_at
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
  uuid, uuid, tstzrange, text, uuid, text, text, text, text, text, text, integer
) from public, anon;
grant execute on function public.hold_slot(
  uuid, uuid, tstzrange, text, uuid, text, text, text, text, text, text, integer
) to authenticated, service_role;

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

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'during', v_booking.during::text
  );
end;
$$;

revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated, service_role;

create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_during tstzrange,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_role text;
  v_resource public.booking_resources%rowtype;
  v_during tstzrange;
  v_window_error text;
  v_payload_hash text;
  v_existing public.idempotency_keys%rowtype;
  v_result jsonb;
begin
  if v_caller is null then
    return jsonb_build_object('error', 'authentication_required');
  end if;

  if p_booking_id is null or p_during is null then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  if p_idempotency_key is not null
     and (char_length(p_idempotency_key) < 1 or char_length(p_idempotency_key) > 200) then
    return jsonb_build_object('error', 'invalid_idempotency_key');
  end if;

  select *
    into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

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

  if v_booking.status not in ('held', 'confirmed') then
    return jsonb_build_object('error', 'booking_not_active');
  end if;

  if v_booking.status = 'held' and v_booking.hold_expires_at <= now() then
    update public.bookings
       set status = 'expired'
     where id = v_booking.id;
    return jsonb_build_object('error', 'hold_expired');
  end if;

  if isempty(p_during) then
    return jsonb_build_object('error', 'invalid_time_range');
  end if;

  v_during := tstzrange(lower(p_during), upper(p_during), '[)');

  v_payload_hash := md5(jsonb_build_object(
    'booking_id', p_booking_id,
    'during', v_during::text
  )::text);

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_booking.atelier_id::text || ':reschedule_booking:' || p_idempotency_key, 0)
    );

    select *
      into v_existing
    from public.idempotency_keys k
    where k.atelier_id = v_booking.atelier_id
      and k.scope = 'reschedule_booking'
      and k.idempotency_key = p_idempotency_key;

    if found then
      if v_existing.payload_hash = v_payload_hash then
        return v_existing.result;
      end if;
      return jsonb_build_object('error', 'idempotency_key_conflict');
    end if;
  end if;

  select *
    into v_resource
  from public.booking_resources r
  where r.id = v_booking.resource_id
    and r.atelier_id = v_booking.atelier_id
    and r.active;

  if not found then
    return jsonb_build_object('error', 'resource_unavailable');
  end if;

  v_window_error := public.booking_window_error(
    v_booking.atelier_id, v_booking.resource_id, v_resource.timezone, v_during
  );
  if v_window_error is not null then
    return jsonb_build_object('error', v_window_error);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_booking.resource_id::text, 0));
  perform public.expire_stale_holds(v_booking.atelier_id, v_booking.resource_id);

  begin
    update public.bookings
       set during = v_during
     where id = v_booking.id
    returning * into v_booking;
  exception
    when exclusion_violation then
      return jsonb_build_object('error', 'slot_unavailable');
  end;

  v_result := jsonb_build_object(
    'booking_id', v_booking.id,
    'status', v_booking.status,
    'during', v_booking.during::text,
    'hold_expires_at', v_booking.hold_expires_at
  );

  if p_idempotency_key is not null then
    insert into public.idempotency_keys (
      atelier_id, scope, idempotency_key, payload_hash, result, booking_id
    ) values (
      v_booking.atelier_id, 'reschedule_booking', p_idempotency_key,
      v_payload_hash, v_result, v_booking.id
    )
    on conflict (atelier_id, scope, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

revoke all on function public.reschedule_booking(uuid, tstzrange, text) from public, anon;
grant execute on function public.reschedule_booking(uuid, tstzrange, text)
  to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. COMMENTS (contract notes for the next reader)
-- ----------------------------------------------------------------------------
comment on table public.bookings is
  'Exclusive reservation store. Live overlap is impossible by GiST constraint; all writes go through SECURITY DEFINER RPCs.';
comment on table public.idempotency_keys is
  'RPC-internal replay ledger. RLS enabled with no policies; it retains the original result including a hold token for replay.';
comment on table public.appointments is
  'Legacy fitting-request store. Unchanged by the Sprint 3 booking engine; overlapping rows are still accepted here (ADR-009 §8).';
