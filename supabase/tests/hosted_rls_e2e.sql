-- ============================================================================
-- STITCHFLOW HOSTED + LOCAL END-TO-END RLS / ONBOARDING / INVITATION PROOF
-- ----------------------------------------------------------------------------
-- Self-contained: creates its own two-tenant fixture, exercises the real
-- functions and policies, asserts every boundary, and rolls back. It does not
-- depend on seed data, so the exact same file runs against:
--
--   npm run verify:db                    (disposable local Postgres)
--   npm run verify:hosted                (linked hosted Supabase project)
--
-- Any failed assertion raises and aborts the transaction with a non-zero exit.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. AUTH IDENTITIES (three roles per tenant plus two invitees)
-- ----------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('e2e00001-0001-4001-8001-000000000001', 'owner-a@e2e.invalid',  now(), '{"full_name":"Owner A"}'::jsonb),
  ('e2e00002-0002-4002-8002-000000000002', 'artisan-a@e2e.invalid', now(), '{"full_name":"Artisan A"}'::jsonb),
  ('e2e00003-0003-4003-8003-000000000003', 'client-a@e2e.invalid',   now(), '{"full_name":"Client A"}'::jsonb),
  ('e2e00004-0004-4004-8004-000000000004', 'owner-b@e2e.invalid',   now(), '{"full_name":"Owner B"}'::jsonb),
  ('e2e00005-0005-4005-8005-000000000005', 'client-b@e2e.invalid',   now(), '{"full_name":"Client B"}'::jsonb),
  ('e2e00006-0006-4006-8006-000000000006', 'invitee@e2e.invalid',   now(), '{"full_name":"Invited Patron"}'::jsonb),
  ('e2e00007-0007-4007-8007-000000000007', 'wrong-invitee@e2e.invalid', now(), '{"full_name":"Wrong Invitee"}'::jsonb)
on conflict (id) do nothing;

create temp table e2e_ids (k text primary key, id uuid) on commit drop;
grant all on e2e_ids to authenticated;

-- ----------------------------------------------------------------------------
-- 2. ATOMIC OWNER ONBOARDING (real RPC, RLS role, caller JWT)
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "e2e00001-0001-4001-8001-000000000001", "role": "authenticated"}';

insert into e2e_ids (k, id)
values ('atelier_a', public.create_atelier_for_current_user(
  'E2E Atelier A', 'e2e-atelier-a', 'Tenant A proof atelier', '+254700000001'
));

-- A second onboarding for the same authenticated member must be refused.
DO $$
BEGIN
  BEGIN
    PERFORM public.create_atelier_for_current_user('E2E Atelier A duplicate', 'e2e-atelier-a-2', null, null);
    RAISE EXCEPTION 'expected already_member refusal';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%expected already_member refusal%' THEN
        RAISE;
      END IF;
  END;
  RAISE NOTICE 'PASS [E2E-1] owner onboarding is atomic and refuses a second atelier';
END $$;

reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "e2e00004-0004-4004-8004-000000000004", "role": "authenticated"}';
insert into e2e_ids (k, id)
values ('atelier_b', public.create_atelier_for_current_user(
  'E2E Atelier B', 'e2e-atelier-b', 'Tenant B proof atelier', '+234800000002'
));
reset role;

DO $$
DECLARE
  v_a uuid;
  v_b uuid;
  v_owners_a int;
BEGIN
  SELECT id INTO v_a FROM e2e_ids WHERE k = 'atelier_a';
  SELECT id INTO v_b FROM e2e_ids WHERE k = 'atelier_b';

  ASSERT v_a IS NOT NULL AND v_b IS NOT NULL AND v_a <> v_b, 'onboarding did not create two distinct ateliers';

  SELECT count(*) INTO v_owners_a FROM public.members
  WHERE atelier_id = v_a AND role = 'owner' AND active;

  ASSERT v_owners_a = 1, 'onboarding must create exactly one active owner membership';
  RAISE NOTICE 'PASS [E2E-2] both ateliers exist with exactly one owner membership each';
END $$;

-- ----------------------------------------------------------------------------
-- 3. TWO-TENANT FIXTURES (employee, patrons, orders, balances, measurements)
-- ----------------------------------------------------------------------------
insert into public.members (id, atelier_id, role, full_name, email, active)
values
  ('e2e00002-0002-4002-8002-000000000002', (select id from e2e_ids where k='atelier_a'), 'employee', 'Artisan A', 'artisan-a@e2e.invalid', true),
  ('e2e00003-0003-4003-8003-000000000003', (select id from e2e_ids where k='atelier_a'), 'client',   'Client A',  'client-a@e2e.invalid',  true),
  ('e2e00005-0005-4005-8005-000000000005', (select id from e2e_ids where k='atelier_b'), 'client',   'Client B',  'client-b@e2e.invalid',  true)
on conflict (id) do nothing;

insert into public.orders (
  id, atelier_id, order_code, client_id, assigned_tailor_id, status,
  description, garment_type, fabric_details, estimated_delivery, photo_url
) values
  ('e2e10001-0001-4001-8001-000000000001', (select id from e2e_ids where k='atelier_a'),
   'E2E-A-001', 'e2e00003-0003-4003-8003-000000000003', 'e2e00002-0002-4002-8002-000000000002',
   'stitching', 'Agbada proof order A', 'Grand Agbada', 'Aso-Oke', current_date + 10, null),
  ('e2e10002-0002-4002-8002-000000000002', (select id from e2e_ids where k='atelier_b'),
   'E2E-B-001', 'e2e00005-0005-4005-8005-000000000005', null,
   'cutting', 'Agbada proof order B', 'Grand Agbada', 'Aso-Oke', current_date + 12, null);

insert into public.order_financials (order_id, atelier_id, deposit_amount, balance_due, currency)
values
  ('e2e10001-0001-4001-8001-000000000001', (select id from e2e_ids where k='atelier_a'), 40000, 30000, 'KES'),
  ('e2e10002-0002-4002-8002-000000000002', (select id from e2e_ids where k='atelier_b'), 50000, 25000, 'NGN');

insert into public.measurements (
  id, atelier_id, client_id, unit, chest, waist, hips, length, sleeve, shoulder,
  inseam, neck, agbada_wingspan, sokoto_inseam, fila_cap_head, buba_chest,
  posture_notes, verified_at
) values
  ('e2e20001-0001-4001-8001-000000000001', (select id from e2e_ids where k='atelier_a'),
   'e2e00003-0003-4003-8003-000000000003', 'in', 38.5, 31, 42.5, 59, 24.5, 16,
   31.5, 14.5, 64, 32, 22, 40, 'Tenant A patron drape note', now()),
  ('e2e20002-0002-4002-8002-000000000002', (select id from e2e_ids where k='atelier_b'),
   'e2e00005-0005-4005-8005-000000000005', 'in', 46, 42, 45, 56, 26, 20.5,
   33, 18, 72.5, 34, 23.5, 48, 'Tenant B patron drape note', now());

-- ----------------------------------------------------------------------------
-- 4. OWNER A CANNOT READ OR MUTATE TENANT B
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "e2e00001-0001-4001-8001-000000000001", "role": "authenticated"}';

DO $$
DECLARE
  v_own_orders int;
  v_other_orders int;
  v_other_measurements int;
  v_other_members int;
  v_updated int;
BEGIN
  SELECT count(*) INTO v_own_orders FROM public.orders WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_a');
  SELECT count(*) INTO v_other_orders FROM public.orders WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b');
  SELECT count(*) INTO v_other_measurements FROM public.measurements WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b');
  SELECT count(*) INTO v_other_members FROM public.members WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b') AND role IN ('owner','employee');

  UPDATE public.orders SET status = 'ready' WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b');
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  ASSERT v_own_orders = 1, 'Owner A must see their own order';
  ASSERT v_other_orders = 0, 'CRITICAL: Owner A read Tenant B orders';
  ASSERT v_other_measurements = 0, 'CRITICAL: Owner A read Tenant B measurements';
  ASSERT v_other_members = 0, 'CRITICAL: Owner A read Tenant B staff';
  ASSERT v_updated = 0, 'CRITICAL: Owner A mutated Tenant B orders';
  RAISE NOTICE 'PASS [E2E-3] Owner A isolation: own=%, otherOrders=%, otherMeasurements=%, mutated=%',
    v_own_orders, v_other_orders, v_other_measurements, v_updated;
END $$;

-- ----------------------------------------------------------------------------
-- 5. OWNER B CANNOT READ TENANT A (bidirectional proof)
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "e2e00004-0004-4004-8004-000000000004", "role": "authenticated"}';

DO $$
DECLARE
  v_own_orders int;
  v_other_orders int;
  v_other_measurements int;
BEGIN
  SELECT count(*) INTO v_own_orders FROM public.orders WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b');
  SELECT count(*) INTO v_other_orders FROM public.orders WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_a');
  SELECT count(*) INTO v_other_measurements FROM public.measurements WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_a');

  ASSERT v_own_orders = 1, 'Owner B must see their own order';
  ASSERT v_other_orders = 0, 'CRITICAL: Owner B read Tenant A orders';
  ASSERT v_other_measurements = 0, 'CRITICAL: Owner B read Tenant A measurements';
  RAISE NOTICE 'PASS [E2E-4] Owner B isolation: own=%, otherOrders=%, otherMeasurements=%',
    v_own_orders, v_other_orders, v_other_measurements;
END $$;

-- ----------------------------------------------------------------------------
-- 6. ARTISAN SCOPE: assigned order only, no balances, no other tenant
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "e2e00002-0002-4002-8002-000000000002", "role": "authenticated"}';

DO $$
DECLARE
  v_assigned int;
  v_other_tenant int;
  v_financials int;
  v_measurements int;
BEGIN
  SELECT count(*) INTO v_assigned FROM public.orders WHERE assigned_tailor_id = 'e2e00002-0002-4002-8002-000000000002';
  SELECT count(*) INTO v_other_tenant FROM public.orders WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b');
  SELECT count(*) INTO v_financials FROM public.order_financials;
  SELECT count(*) INTO v_measurements FROM public.measurements WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b');

  ASSERT v_assigned = 1, 'Artisan must see their assigned order';
  ASSERT v_other_tenant = 0, 'CRITICAL: Artisan intercepted the other tenant';
  ASSERT v_financials = 0, 'CRITICAL: Artisan read balances';
  ASSERT v_measurements = 0, 'CRITICAL: Artisan read the other tenant measurements';
  RAISE NOTICE 'PASS [E2E-5] artisan scope: assigned=%, otherTenant=%, financials=%, measurements=%',
    v_assigned, v_other_tenant, v_financials, v_measurements;
END $$;

-- ----------------------------------------------------------------------------
-- 7. PATRON SCOPE: own order, own measurement, own balance only
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "e2e00003-0003-4003-8003-000000000003", "role": "authenticated"}';

DO $$
DECLARE
  v_own_orders int;
  v_other_orders int;
  v_own_measurements int;
  v_other_measurements int;
  v_own_financials int;
  v_other_financials int;
  v_other_patron int;
BEGIN
  SELECT count(*) INTO v_own_orders FROM public.orders WHERE client_id = 'e2e00003-0003-4003-8003-000000000003';
  SELECT count(*) INTO v_other_orders FROM public.orders WHERE client_id = 'e2e00005-0005-4005-8005-000000000005';
  SELECT count(*) INTO v_own_measurements FROM public.measurements WHERE client_id = 'e2e00003-0003-4003-8003-000000000003';
  SELECT count(*) INTO v_other_measurements FROM public.measurements WHERE client_id = 'e2e00005-0005-4005-8005-000000000005';
  SELECT count(*) INTO v_own_financials FROM public.order_financials WHERE order_id = 'e2e10001-0001-4001-8001-000000000001';
  SELECT count(*) INTO v_other_financials FROM public.order_financials WHERE order_id = 'e2e10002-0002-4002-8002-000000000002';
  SELECT count(*) INTO v_other_patron FROM public.members WHERE id = 'e2e00005-0005-4005-8005-000000000005';

  ASSERT v_own_orders = 1, 'Patron must see their own order';
  ASSERT v_other_orders = 0, 'CRITICAL: Patron read another tenant order';
  ASSERT v_own_measurements = 1, 'Patron must see their own measurement';
  ASSERT v_other_measurements = 0, 'CRITICAL: Patron read another measurement';
  ASSERT v_own_financials = 1, 'Patron must see the balance on their own order';
  ASSERT v_other_financials = 0, 'CRITICAL: Patron read another tenant balance';
  ASSERT v_other_patron = 0, 'CRITICAL: Patron read another patron member row';
  RAISE NOTICE 'PASS [E2E-6] patron scope: ownOrders=%, ownMeasurements=%, ownBalance=%, leaks=%',
    v_own_orders, v_own_measurements, v_own_financials, v_other_orders + v_other_measurements + v_other_patron;
END $$;

-- ----------------------------------------------------------------------------
-- 8. ANONYMOUS PERIMETER
-- ----------------------------------------------------------------------------
reset role;
set local role anon;
set local "request.jwt.claims" = '{}';

DO $$
DECLARE
  v_orders int;
  v_members int;
  v_financials int;
  v_measurements int;
BEGIN
  SELECT count(*) INTO v_orders FROM public.orders;
  SELECT count(*) INTO v_members FROM public.members;
  SELECT count(*) INTO v_financials FROM public.order_financials;
  SELECT count(*) INTO v_measurements FROM public.measurements;

  ASSERT v_orders = 0, 'CRITICAL: Anonymous read orders';
  ASSERT v_members = 0, 'CRITICAL: Anonymous read members';
  ASSERT v_financials = 0, 'CRITICAL: Anonymous read financials';
  ASSERT v_measurements = 0, 'CRITICAL: Anonymous read measurements';
  RAISE NOTICE 'PASS [E2E-7] anonymous perimeter: orders=%, members=%, financials=%, measurements=%',
    v_orders, v_members, v_financials, v_measurements;
END $$;

-- lookup_invitation must not be executable by an anonymous caller.
DO $$
BEGIN
  BEGIN
    PERFORM public.lookup_invitation('E2E-INVITE-0001');
    RAISE EXCEPTION 'expected anonymous lookup_invitation denial';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS [E2E-8] anonymous invitation lookup denied';
END $$;

-- ----------------------------------------------------------------------------
-- 9. INVITATION ISSUANCE + REDEMPTION (owner-scoped, email-bound)
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "e2e00001-0001-4001-8001-000000000001", "role": "authenticated"}';

insert into public.invitations (atelier_id, email, role, invitation_code, invited_by)
values (
  (select id from e2e_ids where k='atelier_a'),
  'invitee@e2e.invalid',
  'client',
  'E2E-INVITE-0001',
  'e2e00001-0001-4001-8001-000000000001'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.invitations (atelier_id, email, role, invitation_code, invited_by)
    VALUES (
      (SELECT id FROM e2e_ids WHERE k='atelier_b'),
      'cross-tenant@e2e.invalid',
      'client',
      'E2E-INVITE-CROSS-0001',
      'e2e00001-0001-4001-8001-000000000001'
    );
    RAISE EXCEPTION 'expected cross-tenant invitation denial';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS [E2E-9] owner cannot invite into another tenant';
END $$;

-- The wrong signed-in email cannot redeem another person's invitation.
set local "request.jwt.claims" = '{"sub": "e2e00007-0007-4007-8007-000000000007", "role": "authenticated"}';

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.accept_invitation('E2E-INVITE-0001');
  ASSERT v_result ->> 'error' = 'email_mismatch',
    'CRITICAL: an invitation was redeemable by the wrong email';
  RAISE NOTICE 'PASS [E2E-10] invitation is bound to the invited email';
END $$;

-- The invited email redeems successfully and becomes an active patron.
set local "request.jwt.claims" = '{"sub": "e2e00006-0006-4006-8006-000000000006", "role": "authenticated"}';

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.accept_invitation('E2E-INVITE-0001');
  ASSERT (v_result ->> 'success')::boolean IS TRUE, 'invitation redemption failed';
  ASSERT v_result ->> 'role' = 'client', 'invitation role was not applied';
  RAISE NOTICE 'PASS [E2E-11] invited patron redeemed the invitation';
END $$;

reset role;

DO $$
DECLARE
  v_member public.members%rowtype;
  v_accepted timestamptz;
BEGIN
  SELECT * INTO v_member FROM public.members WHERE id = 'e2e00006-0006-4006-8006-000000000006';
  SELECT accepted_at INTO v_accepted FROM public.invitations WHERE invitation_code = 'E2E-INVITE-0001';

  ASSERT v_member.role = 'client', 'redeemed membership has the wrong role';
  ASSERT v_member.atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_a'), 'redeemed membership is in the wrong tenant';
  ASSERT v_accepted IS NOT NULL, 'invitation was not marked accepted';
  RAISE NOTICE 'PASS [E2E-12] redemption created a client membership in Tenant A and consumed the invite';
END $$;

-- ----------------------------------------------------------------------------
-- 10. AUDIT TRAIL: settings and role changes are recorded
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "e2e00001-0001-4001-8001-000000000001", "role": "authenticated"}';

update public.ateliers
set tagline = 'Updated settings audit proof'
where id = (select id from e2e_ids where k='atelier_a');

update public.members
set active = false
where id = 'e2e00002-0002-4002-8002-000000000002';

reset role;

DO $$
DECLARE
  v_atelier_audit int;
  v_member_audit int;
BEGIN
  SELECT count(*) INTO v_atelier_audit FROM public.audit_log
  WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_a') AND table_name = 'ateliers';

  SELECT count(*) INTO v_member_audit FROM public.audit_log
  WHERE atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_a') AND table_name = 'members';

  ASSERT v_atelier_audit >= 2, 'settings create/update were not audited';
  ASSERT v_member_audit >= 2, 'membership insert/update was not audited';
  RAISE NOTICE 'PASS [E2E-13] audit trail: atelierRows=%, memberRows=%', v_atelier_audit, v_member_audit;
END $$;

-- ----------------------------------------------------------------------------
-- 11. TENANT ID CANNOT BE REASSIGNED THROUGH AN UPDATE PAYLOAD
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "e2e00001-0001-4001-8001-000000000001", "role": "authenticated"}';

DO $$
BEGIN
  BEGIN
    UPDATE public.orders
    SET atelier_id = (SELECT id FROM e2e_ids WHERE k='atelier_b')
    WHERE id = 'e2e10001-0001-4001-8001-000000000001';
    RAISE EXCEPTION 'expected order tenant reassignment denial';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%expected order tenant reassignment denial%' THEN
        RAISE;
      END IF;
  END;
  RAISE NOTICE 'PASS [E2E-14] order tenant reassignment blocked';
END $$;

reset role;

ROLLBACK;
