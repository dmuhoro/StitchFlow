-- ============================================================================
-- SPRINT 3 — BOOKING ENGINE: RLS, RPC, EXPIRY AND IDEMPOTENCY SUITE
-- ----------------------------------------------------------------------------
-- Runs after `supabase/seed.sql` in a single transaction and rolls back. It
-- exercises the real RPCs and the real RLS policies, not helpers that only the
-- test uses.
--
-- The 200-parallel exclusion proof is a separate process-level test:
--   scripts/db/booking_concurrency_test.sh
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- FIXTURE: two tenants, five resources, weekday rules, one blackout.
-- Tenant A = 11111111-…, Tenant B = 22222222-… (seed identities).
-- ----------------------------------------------------------------------------
insert into public.booking_resources (id, atelier_id, kind, display_name, capacity, timezone, active)
values
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'cutter', 'Master Cutter A', 1, 'UTC', true),
  ('c1111112-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
   'fitter', 'Fitter With No Rules A', 1, 'UTC', true),
  ('c1111113-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111',
   'fitting_room', 'Retired Fitting Room A', 1, 'UTC', false),
  ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   'cutter', 'Master Cutter B', 1, 'UTC', true);

insert into public.resource_availability_rules (atelier_id, resource_id, weekday, starts_at, ends_at)
select '11111111-1111-1111-1111-111111111111',
       'c1111111-1111-1111-1111-111111111111',
       w, '00:00'::time, '23:59'::time
from generate_series(0, 6) as w;

insert into public.resource_availability_rules (atelier_id, resource_id, weekday, starts_at, ends_at)
select '22222222-2222-2222-2222-222222222222',
       'c2222222-2222-2222-2222-222222222222',
       w, '00:00'::time, '23:59'::time
from generate_series(0, 6) as w;

insert into public.blackout_dates (atelier_id, resource_id, during, reason)
values (
  '11111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  tstzrange('2027-05-12 09:00+00', '2027-05-12 10:00+00', '[)'),
  'Atelier closed for a cultural ceremony'
);

create temp table bt_ids (k text primary key, v text not null) on commit drop;
grant all on bt_ids to authenticated;

-- ----------------------------------------------------------------------------
-- B1: A CLIENT HOLDS A SLOT FOR THEMSELVES
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 09:00+00', '2027-05-10 10:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    'zainab@diplomacy.org',
    'Ruracio dowry introduction',
    'Lace underlay selection',
    'hold-key-1',
    10
  );

  assert r ? 'booking_id', 'client hold must return a booking_id';
  assert r ->> 'status' = 'held', 'new booking must be held';
  assert length(r ->> 'hold_token') = 64, 'hold token must be 64 hex characters';
  assert (r ->> 'during')::tstzrange
    = tstzrange('2027-05-10 09:00+00', '2027-05-10 10:00+00', '[)'),
    'range must normalise to [)';

  insert into bt_ids (k, v) values
    ('hold1_id', r ->> 'booking_id'),
    ('hold1_token', r ->> 'hold_token');

  raise notice 'PASS [B1] client hold: booking=%, status=%', r ->> 'booking_id', r ->> 'status';
end $$;

-- ----------------------------------------------------------------------------
-- B2: A RESOURCE WITH NO AVAILABILITY RULE IS NOT BOOKABLE (fail closed)
-- ----------------------------------------------------------------------------
do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111112-1111-1111-1111-111111111112',
    tstzrange('2027-05-12 11:00+00', '2027-05-12 12:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert r ->> 'error' = 'outside_availability',
    'a resource without a matching weekday rule must refuse the hold, got ' || r::text;
  raise notice 'PASS [B2] no availability rule refuses the hold';
end $$;

-- ----------------------------------------------------------------------------
-- B3: A BLACKOUT RANGE REFUSES THE HOLD
-- ----------------------------------------------------------------------------
do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-12 09:15+00', '2027-05-12 09:45+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert r ->> 'error' = 'blackout',
    'a blackout range must refuse the hold, got ' || r::text;
  raise notice 'PASS [B3] blackout refuses the hold';
end $$;

-- ----------------------------------------------------------------------------
-- B4: A CLIENT IN TENANT B CANNOT HOLD IN TENANT A
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "b3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 11:00+00', '2027-05-10 12:00+00', '[)'),
    'fitting',
    'b3333333-3333-3333-3333-333333333333'
  );
  assert r ->> 'error' = 'forbidden',
    'CRITICAL: cross-tenant hold was not refused, got ' || r::text;
  raise notice 'PASS [B4] cross-tenant hold refused';
end $$;

-- ----------------------------------------------------------------------------
-- B5/B6: CLIENT ROLE LIMITS — no booking for another patron, no guest booking
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 11:00+00', '2027-05-10 12:00+00', '[)'),
    'fitting',
    'a4444444-4444-4444-4444-444444444444'
  );
  assert r ->> 'error' = 'forbidden', 'a client must not hold for another patron';

  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 11:00+00', '2027-05-10 12:00+00', '[)'),
    'fitting'
  );
  assert r ->> 'error' = 'forbidden', 'a client must not create a guest booking';

  raise notice 'PASS [B5] client role limits: another patron and guest both refused';
end $$;

-- ----------------------------------------------------------------------------
-- B7: STAFF MAY HOLD FOR A PATRON IN THEIR TENANT
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 11:00+00', '2027-05-10 12:00+00', '[)'),
    'consultation',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    null,
    'Ruracio dowry introduction',
    'Booked by the atelier at the patron''s request',
    null,
    10
  );

  assert r ? 'booking_id', 'staff hold must succeed, got ' || r::text;
  assert r ->> 'status' = 'held', 'staff hold must be held';

  insert into bt_ids (k, v) values
    ('staff_hold_id', r ->> 'booking_id'),
    ('staff_hold_token', r ->> 'hold_token');

  raise notice 'PASS [B7] staff hold for a tenant patron';
end $$;

-- ----------------------------------------------------------------------------
-- B8: ANONYMOUS CALLERS CANNOT EXECUTE ANY BOOKING RPC
-- ----------------------------------------------------------------------------
reset role;
set local role anon;
set local "request.jwt.claims" = '{}';

do $$
declare
  v_blocked int := 0;
begin
  begin
    perform public.hold_slot(
      '11111111-1111-1111-1111-111111111111',
      'c1111111-1111-1111-1111-111111111111',
      tstzrange('2027-05-13 09:00+00', '2027-05-13 10:00+00', '[)'),
      'fitting'
    );
    raise exception 'expected anonymous hold_slot denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    perform public.confirm_booking('0000000000000000000000000000000000000000000000000000000000000000');
    raise exception 'expected anonymous confirm_booking denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    perform public.cancel_booking('c1111111-1111-1111-1111-111111111111');
    raise exception 'expected anonymous cancel_booking denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    perform public.reschedule_booking(
      'c1111111-1111-1111-1111-111111111111',
      tstzrange('2027-05-13 09:00+00', '2027-05-13 10:00+00', '[)')
    );
    raise exception 'expected anonymous reschedule_booking denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  assert v_blocked = 4, 'CRITICAL: an anonymous caller reached a booking RPC';
  raise notice 'PASS [B8] anonymous RPC execute denied: % of 4', v_blocked;
end $$;

-- ----------------------------------------------------------------------------
-- B9: TABLE RLS AS ANONYMOUS — every new table is closed
-- ----------------------------------------------------------------------------
do $$
declare
  v_resources int;
  v_rules int;
  v_blackouts int;
  v_bookings int;
  v_idempotency int;
  v_blocked int := 0;
begin
  select count(*) into v_resources from public.booking_resources;
  select count(*) into v_rules from public.resource_availability_rules;
  select count(*) into v_blackouts from public.blackout_dates;
  select count(*) into v_bookings from public.bookings;
  select count(*) into v_idempotency from public.idempotency_keys;

  assert v_resources = 0, 'CRITICAL: anonymous read booking_resources';
  assert v_rules = 0, 'CRITICAL: anonymous read resource_availability_rules';
  assert v_blackouts = 0, 'CRITICAL: anonymous read blackout_dates';
  assert v_bookings = 0, 'CRITICAL: anonymous read bookings';
  assert v_idempotency = 0, 'CRITICAL: anonymous read idempotency_keys';

  begin
    insert into public.booking_resources (atelier_id, kind, display_name)
    values ('11111111-1111-1111-1111-111111111111', 'cutter', 'Anonymous Injection');
    raise exception 'expected anonymous resource insert denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    insert into public.bookings (atelier_id, resource_id, during, service_type)
    values (
      '11111111-1111-1111-1111-111111111111',
      'c1111111-1111-1111-1111-111111111111',
      tstzrange('2027-05-14 09:00+00', '2027-05-14 10:00+00', '[)'),
      'fitting'
    );
    raise exception 'expected anonymous booking insert denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  assert v_blocked = 2, 'CRITICAL: an anonymous direct write was accepted';
  raise notice 'PASS [B9] anonymous table perimeter closed';
end $$;

-- ----------------------------------------------------------------------------
-- B10: TABLE RLS AS TENANT A PATRON — own tenant, own bookings, read-only
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  v_resources int;
  v_other_resources int;
  v_rules int;
  v_other_rules int;
  v_blackouts int;
  v_bookings int;
  v_other_bookings int;
  v_idempotency int;
  v_updated int;
  v_blocked int := 0;
begin
  select count(*) into v_resources from public.booking_resources
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_other_resources from public.booking_resources
  where atelier_id = '22222222-2222-2222-2222-222222222222';
  select count(*) into v_rules from public.resource_availability_rules
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_other_rules from public.resource_availability_rules
  where atelier_id = '22222222-2222-2222-2222-222222222222';
  select count(*) into v_blackouts from public.blackout_dates
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_bookings from public.bookings
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_other_bookings from public.bookings
  where atelier_id = '22222222-2222-2222-2222-222222222222';
  select count(*) into v_idempotency from public.idempotency_keys;

  -- Tenant A has two seeded active resources plus the two active fixtures in
  -- this test; the retired third fixture is invisible to a client. Rules are
  -- six seeded weekdays per active resource (12) plus seven fixture rules.
  assert v_resources = 4, 'client must see only active resources, saw ' || v_resources;
  assert v_other_resources = 0, 'CRITICAL: client read another tenant resources';
  assert v_rules = 19, 'client must see the nineteen Tenant A weekday rules, saw ' || v_rules;
  assert v_other_rules = 0, 'CRITICAL: client read another tenant availability rules';
  assert v_blackouts = 1, 'client must see their tenant blackout, saw ' || v_blackouts;

  -- The two holds currently in Tenant A belong to this patron.
  assert v_bookings = 2, 'client must see own two holds, saw ' || v_bookings;
  assert v_other_bookings = 0, 'CRITICAL: client read another tenant booking';
  assert v_idempotency = 0, 'CRITICAL: client read the idempotency ledger';

  update public.bookings set service_type = 'tampered'
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics v_updated = row_count;
  assert v_updated = 0, 'CRITICAL: patron updated a booking directly';

  begin
    insert into public.booking_resources (atelier_id, kind, display_name)
    values ('11111111-1111-1111-1111-111111111111', 'cutter', 'Patron Injection');
    raise exception 'expected patron resource insert denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    insert into public.resource_availability_rules (
      atelier_id, resource_id, weekday, starts_at, ends_at
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'c1111111-1111-1111-1111-111111111111', 1, '20:00', '21:00'
    );
    raise exception 'expected patron availability-rule insert denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  begin
    insert into public.blackout_dates (atelier_id, during)
    values ('11111111-1111-1111-1111-111111111111',
            tstzrange('2027-05-20 00:00+00', '2027-05-21 00:00+00', '[)'));
    raise exception 'expected patron blackout insert denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  assert v_blocked = 3, 'CRITICAL: a patron direct write was accepted';
  raise notice 'PASS [B10] patron table scope and write denial';
end $$;

-- ----------------------------------------------------------------------------
-- B11: TENANT B CANNOT CONFIRM, CANCEL OR RESCHEDULE TENANT A'S BOOKING
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "b3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  v_token text;
  v_booking uuid;
  r jsonb;
begin
  select v into v_token from bt_ids where k = 'hold1_token';
  select v::uuid into v_booking from bt_ids where k = 'hold1_id';

  r := public.confirm_booking(v_token);
  assert r ->> 'error' = 'forbidden',
    'CRITICAL: another tenant confirmed Tenant A hold, got ' || r::text;

  r := public.cancel_booking(v_booking);
  assert r ->> 'error' = 'booking_not_found',
    'CRITICAL: another tenant cancelled Tenant A booking, got ' || r::text;

  r := public.reschedule_booking(
    v_booking,
    tstzrange('2027-05-10 13:00+00', '2027-05-10 14:00+00', '[)')
  );
  assert r ->> 'error' = 'booking_not_found',
    'CRITICAL: another tenant rescheduled Tenant A booking, got ' || r::text;

  raise notice 'PASS [B11] cross-tenant confirm/cancel/reschedule denied';
end $$;

-- ----------------------------------------------------------------------------
-- B12: TENANT A OWNER READS STAFF SCOPE BUT STILL CANNOT WRITE DIRECTLY
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

do $$
declare
  v_resources int;
  v_bookings int;
  v_other int;
  v_updated int;
  v_blocked int := 0;
begin
  select count(*) into v_resources from public.booking_resources
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_bookings from public.bookings
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_other from public.bookings
  where atelier_id = '22222222-2222-2222-2222-222222222222';

  assert v_resources = 5, 'owner must see all five Tenant A resources, saw ' || v_resources;
  assert v_bookings = 2, 'owner must see the tenant bookings, saw ' || v_bookings;
  assert v_other = 0, 'CRITICAL: owner read another tenant bookings';

  update public.bookings set status = 'cancelled'
  where atelier_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics v_updated = row_count;
  assert v_updated = 0, 'CRITICAL: owner bypassed the RPC with a direct status write';

  begin
    insert into public.bookings (atelier_id, resource_id, during, service_type)
    values (
      '11111111-1111-1111-1111-111111111111',
      'c1111111-1111-1111-1111-111111111111',
      tstzrange('2027-05-14 09:00+00', '2027-05-14 10:00+00', '[)'),
      'fitting'
    );
    raise exception 'expected owner direct-booking insert denial';
  exception when insufficient_privilege then v_blocked := v_blocked + 1;
  end;

  assert v_blocked = 1, 'CRITICAL: an owner bypassed the RPC boundary';
  raise notice 'PASS [B12] owner staff scope, direct booking writes denied';
end $$;

-- ----------------------------------------------------------------------------
-- B13/B14/B15: CONFIRM — wrong token, valid token, idempotent replay
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  v_token text;
  v_id uuid;
  r jsonb;
begin
  select v into v_token from bt_ids where k = 'hold1_token';
  select v::uuid into v_id from bt_ids where k = 'hold1_id';

  r := public.confirm_booking(repeat('f', 64));
  assert r ->> 'error' = 'invalid_hold_token', 'a wrong token must be refused';

  r := public.confirm_booking(v_token);
  assert r ->> 'booking_id' = v_id::text, 'confirm must return the same booking';
  assert r ->> 'status' = 'confirmed', 'confirm must move the row to confirmed';

  r := public.confirm_booking(v_token);
  assert r ->> 'booking_id' = v_id::text, 'confirmation replay must return the same booking';
  assert r ->> 'status' = 'confirmed', 'confirmation replay must not change state';

  raise notice 'PASS [B13] confirm: wrong token refused, valid token confirmed, replay stable';
end $$;

-- ----------------------------------------------------------------------------
-- B16: CANCEL IS IDEMPOTENT AND RELEASES THE EXCLUSION
-- ----------------------------------------------------------------------------
do $$
declare
  v_id uuid;
  r jsonb;
begin
  select v::uuid into v_id from bt_ids where k = 'hold1_id';

  r := public.cancel_booking(v_id);
  assert r ->> 'status' = 'cancelled', 'cancel must move the row to cancelled';

  r := public.cancel_booking(v_id);
  assert r ->> 'status' = 'cancelled', 'cancel replay must stay cancelled';

  -- The old range is released; the same client can hold it again.
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 09:00+00', '2027-05-10 10:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert r ? 'booking_id', 'cancelled range must be bookable again, got ' || r::text;
  perform public.cancel_booking((r ->> 'booking_id')::uuid);

  raise notice 'PASS [B16] cancel idempotent; cancelled range released';
end $$;

-- ----------------------------------------------------------------------------
-- B17: EXPIRED HOLDS ARE SWEPT INSIDE THE NEXT HOLD TRANSACTION
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

do $$
declare
  r jsonb;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 13:00+00', '2027-05-10 14:00+00', '[)'),
    'consultation',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert r ? 'booking_id', 'expiry fixture hold failed: ' || r::text;
  insert into bt_ids (k, v) values
    ('expired_id', r ->> 'booking_id'),
    ('expired_token', r ->> 'hold_token');
end $$;

-- Inject an expired clock as the test fixture owner. The RPC paths below are
-- still the real product paths; only the clock is moved.
reset role;
update public.bookings
   set hold_expires_at = now() - interval '1 minute'
 where id = (select v::uuid from bt_ids where k = 'expired_id');

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  v_token text;
  v_expired_id uuid;
  r jsonb;
begin
  select v into v_token from bt_ids where k = 'expired_token';
  select v::uuid into v_expired_id from bt_ids where k = 'expired_id';

  r := public.confirm_booking(v_token);
  assert r ->> 'error' = 'hold_expired', 'an expired hold must not confirm';

  -- A different patron in the same tenant now books the freed range. The hold
  -- RPC must expire the stale held row in its own transaction first.
  set local "request.jwt.claims" = '{"sub": "a4444444-4444-4444-4444-444444444444", "role": "authenticated"}';

  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-10 13:00+00', '2027-05-10 14:00+00', '[)'),
    'fitting',
    'a4444444-4444-4444-4444-444444444444'
  );
  assert r ? 'booking_id', 'expired hold still blocked the slot: ' || r::text;
  perform public.cancel_booking((r ->> 'booking_id')::uuid);

  raise notice 'PASS [B17] expired hold refused and swept inside the hold transaction';
end $$;

-- ----------------------------------------------------------------------------
-- B18/B19: RESCHEDULE — atomic move, conflict refusal, idempotent replay
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

do $$
declare
  r jsonb;
  v_id uuid;
begin
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-11 09:00+00', '2027-05-11 10:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333'
  );
  assert r ? 'booking_id', 'reschedule fixture hold failed: ' || r::text;
  v_id := (r ->> 'booking_id')::uuid;
  perform public.confirm_booking(r ->> 'hold_token');

  r := public.reschedule_booking(
    v_id,
    tstzrange('2027-05-11 11:00+00', '2027-05-11 12:00+00', '[)'),
    'resched-key-1'
  );
  assert r ->> 'booking_id' = v_id::text, 'reschedule must keep the same booking';
  assert (r ->> 'during')::tstzrange
    = tstzrange('2027-05-11 11:00+00', '2027-05-11 12:00+00', '[)'),
    'reschedule must move the range';

  -- Replay the same key and payload: identical result, no second booking.
  r := public.reschedule_booking(
    v_id,
    tstzrange('2027-05-11 11:00+00', '2027-05-11 12:00+00', '[)'),
    'resched-key-1'
  );
  assert r ->> 'booking_id' = v_id::text, 'reschedule replay must return the original booking';

  -- Same key, different payload: explicit conflict.
  r := public.reschedule_booking(
    v_id,
    tstzrange('2027-05-11 15:00+00', '2027-05-11 16:00+00', '[)'),
    'resched-key-1'
  );
  assert r ->> 'error' = 'idempotency_key_conflict',
    'same key with a different reschedule payload must conflict, got ' || r::text;

  insert into bt_ids (k, v) values ('resched_id', v_id::text);

  raise notice 'PASS [B18] reschedule moves atomically and replays idempotently';
end $$;

do $$
declare
  v_id uuid;
  v_other_id uuid;
  r jsonb;
begin
  select v::uuid into v_id from bt_ids where k = 'resched_id';

  -- Occupy the target range with a second patron's confirmed booking.
  set local "request.jwt.claims" = '{"sub": "a4444444-4444-4444-4444-444444444444", "role": "authenticated"}';
  r := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-11 15:00+00', '2027-05-11 16:00+00', '[)'),
    'fitting',
    'a4444444-4444-4444-4444-444444444444'
  );
  assert r ? 'booking_id', 'conflict fixture hold failed: ' || r::text;
  v_other_id := (r ->> 'booking_id')::uuid;
  perform public.confirm_booking(r ->> 'hold_token');
  insert into bt_ids (k, v) values ('other_patron_booking', v_other_id::text);

  -- Back to the first patron, who tries to move into the occupied range.
  set local "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
  r := public.reschedule_booking(
    v_id,
    tstzrange('2027-05-11 15:00+00', '2027-05-11 16:00+00', '[)')
  );
  assert r ->> 'error' = 'slot_unavailable',
    'reschedule into an occupied range must refuse, got ' || r::text;

  -- The original booking must still be at its previous range.
  r := public.cancel_booking(v_id); -- cancel returns the current row
  assert (r ->> 'during')::tstzrange
    = tstzrange('2027-05-11 11:00+00', '2027-05-11 12:00+00', '[)'),
    'a refused reschedule must not move the original booking';
  assert r ->> 'status' = 'cancelled', 'cancel after refused reschedule failed';

  raise notice 'PASS [B19] reschedule conflict refused and original range preserved';
end $$;

-- ----------------------------------------------------------------------------
-- B20: HOLD IDEMPOTENCY — replay returns the original token; mismatch errors
-- ----------------------------------------------------------------------------
do $$
declare
  v_first jsonb;
  v_second jsonb;
  v_third jsonb;
  v_conflict jsonb;
  v_rows int;
  v_token_first text;
  v_token_second text;
begin
  v_first := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-13 09:00+00', '2027-05-13 10:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333',
    null, null, null, null, null,
    'idem-hold-1',
    10
  );
  assert v_first ? 'booking_id', 'idempotent hold failed: ' || v_first::text;
  v_token_first := v_first ->> 'hold_token';

  v_second := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-13 09:00+00', '2027-05-13 10:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333',
    null, null, null, null, null,
    'idem-hold-1',
    10
  );
  assert v_second ->> 'booking_id' = v_first ->> 'booking_id',
    'same key + same payload must return the original booking';
  assert v_second ->> 'replayed' = 'true',
    'a replay must declare itself as a replay';
  v_token_second := v_second ->> 'hold_token';
  assert v_token_second <> v_token_first,
    'a replay must rotate the hold token, not return the original';

  -- The rotated token invalidates the first one; only the newest token can
  -- confirm. This is what keeps a leaked historical replay from being useful.
  v_third := public.confirm_booking(v_token_first);
  assert v_third ->> 'error' = 'invalid_hold_token',
    'the superseded hold token must not confirm, got ' || v_third::text;

  v_third := public.confirm_booking(v_token_second);
  assert v_third ->> 'status' = 'confirmed',
    'the rotated token must confirm, got ' || v_third::text;

  -- A replay after confirmation returns the current state with no token.
  v_third := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-13 09:00+00', '2027-05-13 10:00+00', '[)'),
    'fitting',
    'a3333333-3333-3333-3333-333333333333',
    null, null, null, null, null,
    'idem-hold-1',
    10
  );
  assert v_third ->> 'status' = 'confirmed',
    'a replay after confirmation must report the confirmed state';
  assert v_third ->> 'hold_token' is null,
    'a finished hold must not hand back a token';

  v_conflict := public.hold_slot(
    '11111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    tstzrange('2027-05-13 09:00+00', '2027-05-13 10:00+00', '[)'),
    'consultation',
    'a3333333-3333-3333-3333-333333333333',
    null, null, null, null, null,
    'idem-hold-1',
    10
  );
  assert v_conflict ->> 'error' = 'idempotency_key_conflict',
    'same key with a different hold payload must conflict, got ' || v_conflict::text;

  select count(*) into v_rows
  from public.bookings
  where idempotency_key = 'idem-hold-1';
  assert v_rows = 1, 'idempotent replay created a duplicate booking';

  perform public.cancel_booking((v_first ->> 'booking_id')::uuid);

  raise notice 'PASS [B20] replay rotates the token; old token invalid; mismatch conflicts';
end $$;

-- ----------------------------------------------------------------------------
-- B21: PATRON CANNOT CANCEL/RESCHEDULE ANOTHER PATRON'S BOOKING; STAFF CAN
-- ----------------------------------------------------------------------------
do $$
declare
  v_other uuid;
  r jsonb;
begin
  select v::uuid into v_other from bt_ids where k = 'other_patron_booking';

  r := public.cancel_booking(v_other);
  assert r ->> 'error' = 'forbidden', 'a patron cancelled another patron''s booking';

  r := public.reschedule_booking(
    v_other,
    tstzrange('2027-05-11 17:00+00', '2027-05-11 18:00+00', '[)')
  );
  assert r ->> 'error' = 'forbidden', 'a patron rescheduled another patron''s booking';

  raise notice 'PASS [B21] patron-to-patron cancel/reschedule denied';
end $$;

set local "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

do $$
declare
  v_other uuid;
  r jsonb;
begin
  select v::uuid into v_other from bt_ids where k = 'other_patron_booking';

  r := public.cancel_booking(v_other);
  assert r ->> 'status' = 'cancelled',
    'staff must be able to cancel a tenant booking, got ' || r::text;

  raise notice 'PASS [B22] staff can cancel a tenant booking';
end $$;

-- ----------------------------------------------------------------------------
-- B23: STRUCTURAL PROOF — the exclusion constraint exists with the right shape
-- ----------------------------------------------------------------------------
reset role;

do $$
declare
  v_def text;
begin
  select pg_get_constraintdef(c.oid)
    into v_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'bookings'
    and c.conname = 'bookings_no_overlap';

  assert v_def is not null, 'bookings_no_overlap is missing';
  assert v_def ilike '%EXCLUDE USING gist%', 'bookings_no_overlap is not a GiST exclusion';
  assert v_def ilike '%resource_id WITH =%', 'exclusion is not keyed by resource_id';
  assert v_def ilike '%during WITH &&%', 'exclusion is not keyed by during overlap';
  assert v_def ilike '%held%confirmed%', 'exclusion predicate must cover held and confirmed';

  raise notice 'PASS [B23] exclusion constraint shape: %', v_def;
end $$;

ROLLBACK;
