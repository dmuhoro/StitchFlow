-- ============================================================================
-- SPRINT 3B — STAFF BOOKING SLICE: AVAILABILITY, LINKS, SWEEP, REPLAY
-- ----------------------------------------------------------------------------
-- Runs after `supabase/tests/booking_engine_test.sql` (which rolls back) and
-- after `supabase/seed.sql`. Every assertion drives the real RPCs and the real
-- RLS policies. Nothing here writes a table directly except the clock fixture
-- updates, which stand in for the passage of time.
--
-- Proves:
--   S1  bookings.appointment_id is tenant-scoped and one live booking per request
--   S2  get_availability is authenticated-only, tenant-scoped, rule/blackout
--       aware, treats expired holds as free, and returns UTC slots
--   S3  expire_stale_holds() is service_role-only and scrubs dead ledger tokens
--   S4  a booking can be linked to a pending request; duplicates and
--       cross-tenant/completed requests are refused; cancellation releases it
--   S5  a genuinely occupied slot returns slot_unavailable
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- FIXTURES
-- ----------------------------------------------------------------------------
insert into public.booking_resources (id, atelier_id, kind, display_name, capacity, timezone, active)
values
  ('d1111111-1111-4001-8001-111111111111',
   '11111111-1111-1111-1111-111111111111',
   'cutter', 'Availability Proof Cutter', 1, 'UTC', true),
  ('d1111112-1111-4001-8001-111111111112',
   '11111111-1111-1111-1111-111111111111',
   'fitter', 'Availability Proof Fitter (no rules)', 1, 'UTC', true);

-- 2027-07-05 is a Monday. One weekday window keeps the expected slots exact.
insert into public.resource_availability_rules (atelier_id, resource_id, weekday, starts_at, ends_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'd1111111-1111-4001-8001-111111111111',
  1, '09:00'::time, '12:00'::time
);

insert into public.appointments (
  id, atelier_id, client_id, client_name, client_phone, client_email,
  service_type, slot_datetime, status, assigned_tailor_id,
  cultural_occasion, notes
)
values
(
  'e1111111-1111-4001-8001-111111111111',
  '11111111-1111-1111-1111-111111111111',
  null, 'Wanjiru Mwangi', '+254711223344', 'wanjiru.mwangi@example.ke',
  'basted_fitting', '2027-07-05 09:00+00', 'pending', null,
  'Ruracio bridal basted fitting',
  'Public request from the Nairobi lookbook.'
),
(
  'e1111112-1111-4001-8001-111111111112',
  '11111111-1111-1111-1111-111111111111',
  null, 'Achieng Otieno', '+254722334455', 'achieng.otieno@example.ke',
  'final_collection', '2027-07-05 10:00+00', 'pending', null,
  'Kitenge wax final collection',
  'Second public request competing for the same cutter.'
),
(
  'e1111113-1111-4001-8001-111111111113',
  '11111111-1111-1111-1111-111111111111',
  null, 'Completed Request', '+254733445566', null,
  'basted_fitting', '2027-07-05 11:00+00', 'completed', null,
  null, null
),
(
  'e4444444-4444-4001-8001-444444444444',
  '22222222-2222-2222-2222-222222222222',
  null, 'Cross Tenant Request', '+2348023344556', null,
  'grand_agbada', '2027-07-05 09:00+00', 'pending', null,
  null, null
);

create temp table st_ids (k text primary key, v text not null) on commit drop;
grant all on st_ids to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- S1: STRUCTURAL PROOF — LINK, TENANT FK, PARTIAL UNIQUE, POLICIES UNTOUCHED
-- ----------------------------------------------------------------------------
do $$
declare
  v_column int;
  v_fk int;
  v_unique int;
  v_public_policy int;
begin
  select count(*) into v_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'bookings'
    and column_name = 'appointment_id';
  assert v_column = 1, 'bookings.appointment_id is missing';

  select count(*) into v_fk
  from pg_constraint
  where conname = 'bookings_appointment_tenant_fk'
    and conrelid = 'public.bookings'::regclass
    and contype = 'f';
  assert v_fk = 1, 'the tenant-scoped appointment foreign key is missing';

  select count(*) into v_unique
  from pg_indexes
  where schemaname = 'public'
    and indexname = 'bookings_appointment_live_unique';
  assert v_unique = 1, 'the one-live-booking-per-request index is missing';

  -- The staff slice links from bookings; it must not quietly alter the
  -- anonymous request policy on appointments.
  select count(*) into v_public_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'appointments'
    and policyname = 'appointments_public_insert';
  assert v_public_policy = 1, 'appointments_public_insert was removed';

  raise notice 'PASS [S1] appointment link, tenant FK, live uniqueness, public insert retained';
end $$;

-- ----------------------------------------------------------------------------
-- S2: AVAILABILITY — RULES, BLACKOUTS, LIVE HOLDS, EXPIRED HOLDS, TENANCY
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );

  assert r ->> 'timezone' = 'UTC', 'availability must report the resource timezone';
  assert jsonb_array_length(r -> 'slots') = 3,
    'expected three one-hour slots, got ' || r::text;
  assert r -> 'slots' -> 0 ->> 'start' = '2027-07-05T09:00:00Z',
    'the first slot must start at 09:00 UTC';
  assert r -> 'slots' -> 2 ->> 'end' = '2027-07-05T12:00:00Z',
    'the last slot must end at the rule boundary';

  raise notice 'PASS [S2a] availability projects three rule-bounded slots';
end $$;

-- A blackout subtracts the windows it overlaps.
insert into public.blackout_dates (atelier_id, resource_id, during, reason)
values (
  '11111111-1111-1111-1111-111111111111',
  'd1111111-1111-4001-8001-111111111111',
  tstzrange('2027-07-05 10:15+00', '2027-07-05 11:15+00', '[)'),
  'Ceremonial closure'
);

do $$
declare
  r jsonb;
begin
  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );
  assert jsonb_array_length(r -> 'slots') = 1,
    'a 10:15-11:15 blackout must leave only the 09:00 slot, got ' || r::text;
  assert r -> 'slots' -> 0 ->> 'start' = '2027-07-05T09:00:00Z',
    'the surviving slot must be 09:00';

  raise notice 'PASS [S2b] blackout subtracts overlapping slots';
end $$;

delete from public.blackout_dates
where resource_id = 'd1111111-1111-4001-8001-111111111111';

-- A live hold removes its slot; an expired hold does not.
do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 09:00+00', '2027-07-05 10:00+00', '[)'),
    'basted_fitting',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert r ? 'booking_id', 'availability fixture hold failed: ' || r::text;

  insert into st_ids (k, v) values ('live_hold_id', r ->> 'booking_id');

  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );
  assert jsonb_array_length(r -> 'slots') = 2,
    'a live hold must remove one slot, got ' || r::text;
  assert r -> 'slots' -> 0 ->> 'start' = '2027-07-05T10:00:00Z',
    'the free slots must start after the held range';

  raise notice 'PASS [S2c] live hold removes exactly its slot';
end $$;

-- Move the clock: only the fixture row changes, the RPCs stay real.
reset role;
update public.bookings
   set hold_expires_at = now() - interval '1 minute'
 where id = (select v::uuid from st_ids where k = 'live_hold_id');

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );
  assert jsonb_array_length(r -> 'slots') = 3,
    'an expired hold must be treated as free, got ' || r::text;
  assert r -> 'slots' -> 0 ->> 'start' = '2027-07-05T09:00:00Z',
    'the expired slot must be offered again';

  raise notice 'PASS [S2d] expired hold counts as free';
end $$;

-- Fail-closed arguments and a resource with no rule.
do $$
declare
  r jsonb;
begin
  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111112-1111-4001-8001-111111111112',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );
  assert jsonb_array_length(r -> 'slots') = 0,
    'a resource with no availability rule must return no slots';

  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-01 00:00+00',
    '2027-09-01 00:00+00',
    60
  );
  assert r ->> 'error' = 'range_too_large',
    'an unbounded availability query must fail closed, got ' || r::text;

  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    5
  );
  assert r ->> 'error' = 'invalid_slot_minutes',
    'an invalid slot length must be refused, got ' || r::text;

  raise notice 'PASS [S2e] no rules, oversized range, invalid slot length all fail closed';
end $$;

-- Cross-tenant caller and anonymous caller.
set local "request.jwt.claims" = '{"sub": "b3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );
  assert r ->> 'error' = 'forbidden',
    'CRITICAL: another tenant read Tenant A availability, got ' || r::text;

  raise notice 'PASS [S2f] cross-tenant availability refused';
end $$;

reset role;
set local role anon;
set local "request.jwt.claims" = '{}';

do $$
declare
  v_blocked int := 0;
begin
  begin
    perform public.get_availability(
      '11111111-1111-1111-1111-111111111111',
      'd1111111-1111-4001-8001-111111111111',
      '2027-07-05 00:00+00',
      '2027-07-06 00:00+00',
      60
    );
    raise exception 'expected anonymous get_availability denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    perform public.expire_stale_holds();
    raise exception 'expected anonymous expire_stale_holds denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  assert v_blocked = 2, 'CRITICAL: an anonymous caller reached a staff RPC';
  raise notice 'PASS [S2g] anonymous availability and sweep execute denied';
end $$;

-- ----------------------------------------------------------------------------
-- S3: SCHEDULER SWEEP — SERVICE_ROLE ONLY, EXPIRES AND SCRUBS
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 09:00+00', '2027-07-05 10:00+00', '[)'),
    'basted_fitting',
    'a3333333-3333-3333-3333-333333333333',
    null, null, null, null, null,
    'sweep-key-1',
    10
  );
  assert r ? 'booking_id', 'sweep fixture hold failed: ' || r::text;
  insert into st_ids (k, v) values ('sweep_hold_id', r ->> 'booking_id');
end $$;

do $$
declare
  v_blocked int := 0;
begin
  begin
    perform public.expire_stale_holds();
    raise exception 'expected authenticated expire_stale_holds denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;
  assert v_blocked = 1, 'CRITICAL: authenticated executed the global sweep';
  raise notice 'PASS [S3a] authenticated cannot execute the global sweep';
end $$;

reset role;
update public.bookings
   set hold_expires_at = now() - interval '1 minute'
 where id = (select v::uuid from st_ids where k = 'sweep_hold_id');

set local role service_role;

do $$
declare
  v_count int;
  v_status text;
  v_token_present boolean;
begin
  v_count := public.expire_stale_holds();
  assert v_count >= 1, 'the global sweep expired no rows';

  select status into v_status
  from public.bookings
  where id = (select v::uuid from st_ids where k = 'sweep_hold_id');
  assert v_status = 'expired', 'the swept hold was not marked expired, got ' || v_status;

  select result ? 'hold_token' into v_token_present
  from public.idempotency_keys
  where atelier_id = '11111111-1111-1111-1111-111111111111'
    and scope = 'hold_slot'
    and idempotency_key = 'sweep-key-1';
  assert v_token_present is false,
    'the sweep must scrub a dead hold token from the replay ledger';

  raise notice 'PASS [S3b] service_role sweep expired=% and scrubbed the ledger token', v_count;
end $$;

-- ----------------------------------------------------------------------------
-- S4: LINK A PENDING REQUEST, REFUSE DUPLICATES, RELEASE ON CANCEL
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

do $$
declare
  r jsonb;
  v_id uuid;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 09:00+00', '2027-07-05 10:00+00', '[)'),
    'basted_fitting',
    null, null, null, null, null, null, null,
    10,
    'e1111111-1111-4001-8001-111111111111'
  );

  assert r ? 'booking_id', 'linked hold failed: ' || r::text;
  assert r ->> 'appointment_id' = 'e1111111-1111-4001-8001-111111111111',
    'the hold result must carry the appointment link';
  assert r ->> 'status' = 'held', 'the linked booking must be held';

  v_id := (r ->> 'booking_id')::uuid;
  insert into st_ids (k, v) values
    ('linked_booking_id', v_id::text),
    ('linked_booking_token', r ->> 'hold_token');

  -- Contact details were not supplied; they must come from the request.
  assert (select guest_name from public.bookings where id = v_id) = 'Wanjiru Mwangi',
    'the booking must inherit the request contact name';
  assert (select guest_phone from public.bookings where id = v_id) = '+254711223344',
    'the booking must inherit the request phone';
  assert (select appointment_id from public.bookings where id = v_id)
    = 'e1111111-1111-4001-8001-111111111111',
    'the booking row must persist the appointment link';

  raise notice 'PASS [S4a] pending request links to a held booking and supplies contact details';
end $$;

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 11:00+00', '2027-07-05 12:00+00', '[)'),
    'basted_fitting',
    null, null, null, null, null, null, null,
    10,
    'e1111111-1111-4001-8001-111111111111'
  );
  assert r ->> 'error' = 'appointment_already_booked',
    'a request with a live booking must refuse a second booking, got ' || r::text;

  raise notice 'PASS [S4b] one live booking per request';
end $$;

-- Confirm the linked booking, then try the same request again.
do $$
declare
  v_token text;
  r jsonb;
begin
  select v into v_token from st_ids where k = 'linked_booking_token';
  r := public.confirm_booking(v_token);
  assert r ->> 'status' = 'confirmed', 'linked confirmation failed: ' || r::text;

  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 11:00+00', '2027-07-05 12:00+00', '[)'),
    'basted_fitting',
    null, null, null, null, null, null, null,
    10,
    'e1111111-1111-4001-8001-111111111111'
  );
  assert r ->> 'error' = 'appointment_already_booked',
    'a confirmed request must still refuse a second booking, got ' || r::text;

  raise notice 'PASS [S4c] confirmation does not reopen the request';
end $$;

-- Cross-tenant and completed requests are refused with precise tokens.
do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 11:00+00', '2027-07-05 12:00+00', '[)'),
    'basted_fitting',
    null, null, null, null, null, null, null,
    10,
    'e4444444-4444-4001-8001-444444444444'
  );
  assert r ->> 'error' = 'appointment_not_found',
    'CRITICAL: a cross-tenant request was linked, got ' || r::text;

  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 11:00+00', '2027-07-05 12:00+00', '[)'),
    'basted_fitting',
    null, null, null, null, null, null, null,
    10,
    'e1111113-1111-4001-8001-111111111113'
  );
  assert r ->> 'error' = 'appointment_not_pending',
    'a completed request must not be booked, got ' || r::text;

  raise notice 'PASS [S4d] cross-tenant and completed requests refused';
end $$;

-- Cancelling the confirmed booking releases both the slot and the request.
do $$
declare
  v_id uuid;
  r jsonb;
begin
  select v::uuid into v_id from st_ids where k = 'linked_booking_id';

  r := public.cancel_booking(v_id);
  assert r ->> 'status' = 'cancelled', 'linked cancel failed: ' || r::text;

  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 09:00+00', '2027-07-05 10:00+00', '[)'),
    'basted_fitting',
    null, null, null, null, null, null, null,
    10,
    'e1111111-1111-4001-8001-111111111111'
  );
  assert r ? 'booking_id',
    'a cancelled booking must release its request for re-confirmation, got ' || r::text;

  perform public.cancel_booking((r ->> 'booking_id')::uuid);

  raise notice 'PASS [S4e] cancellation releases the request and the slot';
end $$;

-- ----------------------------------------------------------------------------
-- S5: A GENUINELY OCCUPIED SLOT RETURNS slot_unavailable
-- ----------------------------------------------------------------------------
do $$
declare
  v_first jsonb;
  v_second jsonb;
begin
  v_first := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 10:00+00', '2027-07-05 11:00+00', '[)'),
    'final_collection',
    null, null, null, null, null, null, null,
    10,
    'e1111112-1111-4001-8001-111111111112'
  );
  assert v_first ? 'booking_id', 'slot-taken fixture hold failed: ' || v_first::text;
  perform public.confirm_booking(v_first ->> 'hold_token');

  v_second := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    tstzrange('2027-07-05 10:30+00', '2027-07-05 11:30+00', '[)'),
    'basted_fitting',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert v_second ->> 'error' = 'slot_unavailable',
    'an occupied slot must return slot_unavailable, got ' || v_second::text;

  raise notice 'PASS [S5a] occupied slot returns slot_unavailable';
end $$;

do $$
declare
  r jsonb;
begin
  r := public.get_availability(
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-4001-8001-111111111111',
    '2027-07-05 00:00+00',
    '2027-07-06 00:00+00',
    60
  );
  assert jsonb_array_length(r -> 'slots') = 2,
    'a confirmed booking must subtract one slot, got ' || r::text;
  assert r -> 'slots' -> 0 ->> 'start' = '2027-07-05T09:00:00Z',
    'the free slot before the booking must remain';
  assert r -> 'slots' -> 1 ->> 'start' = '2027-07-05T11:00:00Z',
    'the free slot after the booking must remain';

  raise notice 'PASS [S5b] confirmed booking subtracts its slot from availability';
end $$;

ROLLBACK;
