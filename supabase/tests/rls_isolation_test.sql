-- ============================================================================
-- STITCHFLOW ROW LEVEL SECURITY (RLS) MULTI-TENANT ISOLATION SUITE
-- ----------------------------------------------------------------------------
-- Executed by `npm run verify:db` (local Docker) and by CI against a disposable
-- postgres:16 service. Every scenario runs inside one transaction that is rolled
-- back, so the suite is repeatable and never mutates seed data.
--
-- Identity is simulated with Supabase's JWT claim GUC, exactly as PostgREST
-- presents it to Postgres. Assertions abort the script on any leak.
-- ============================================================================

BEGIN;

-- A private lookbook entry used by the anonymous-visibility test.
insert into public.lookbook_items (
  id, atelier_id, title, category, description, fabric, price_range,
  turnaround_days, image_url, cultural_origin, tags, is_featured, is_published
)
values (
  'a50000ff-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Unpublished Atelier Draft',
  'Ceremonial & Bridal',
  'Draft entry that must never reach an anonymous visitor.',
  'Private sample',
  'KES 0',
  7,
  'https://example.invalid/draft.jpg',
  'Internal',
  array['draft'],
  false,
  false
);

-- ----------------------------------------------------------------------------
-- TEST 1: TENANT A OWNER CANNOT VIEW TENANT B ORDERS
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

DO $$
DECLARE
  v_own INT;
  v_leak INT;
  v_financial_order uuid;
  v_financial_audit INT;
  v_other_financial_audit INT;
  v_updated INT;
BEGIN
  SELECT count(*) INTO v_own FROM public.orders
  WHERE atelier_id = '11111111-1111-1111-1111-111111111111';

  SELECT count(*) INTO v_leak FROM public.orders
  WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

  ASSERT v_own >= 3, 'Tenant A owner should see their own atelier orders';
  ASSERT v_leak = 0, 'CRITICAL: Tenant A owner can see Tenant B orders';

  SELECT order_id INTO v_financial_order
  FROM public.order_financials
  WHERE atelier_id = '11111111-1111-1111-1111-111111111111'
  ORDER BY order_id
  LIMIT 1;
  ASSERT v_financial_order IS NOT NULL, 'Tenant A fixture must have order financials';

  UPDATE public.order_financials
  SET balance_due = balance_due + 0.01
  WHERE order_id = v_financial_order;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  ASSERT v_updated = 1, 'Owner must be able to update their order financials';

  SELECT count(*) INTO v_financial_audit
  FROM public.audit_log
  WHERE atelier_id = '11111111-1111-1111-1111-111111111111'
    AND table_name = 'order_financials'
    AND record_id = v_financial_order
    AND action = 'update'
    AND actor_user_id = auth.uid()
    AND before_data ->> 'balance_due' <> after_data ->> 'balance_due';
  ASSERT v_financial_audit = 1, 'Owner financial edit must record before/after values and actor';
  SELECT count(*) INTO v_other_financial_audit
  FROM public.audit_log
  WHERE atelier_id = '22222222-2222-2222-2222-222222222222'
    AND table_name = 'order_financials';
  ASSERT v_other_financial_audit = 0, 'CRITICAL: Owner can read another atelier financial audit';
  RAISE NOTICE 'PASS [1] owner order isolation: own=%, leaked=%', v_own, v_leak;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 2: TENANT A OWNER CANNOT MUTATE TENANT B MEASUREMENTS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.measurements
  SET posture_notes = 'MALICIOUS_OVERWRITE'
  WHERE id = 'b0000001-1111-1111-1111-111111111111';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  ASSERT v_updated = 0, 'CRITICAL: Tenant A mutated a Tenant B measurement card';
  RAISE NOTICE 'PASS [2] cross-tenant write isolation: rows mutated=%', v_updated;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 3: ARTISAN SCOPE AND FINANCIAL ISOLATION
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

DO $$
DECLARE
  v_assigned INT;
  v_other_tenant INT;
  v_other_measurements INT;
  v_financials INT;
  v_financial_audit INT;
  v_members INT;
BEGIN
  SELECT count(*) INTO v_assigned FROM public.orders
  WHERE assigned_tailor_id = 'a2222222-2222-2222-2222-222222222222';

  SELECT count(*) INTO v_other_tenant FROM public.orders
  WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

  SELECT count(*) INTO v_other_measurements FROM public.measurements
  WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

  SELECT count(*) INTO v_financials FROM public.order_financials;

  SELECT count(*) INTO v_financial_audit FROM public.audit_log
  WHERE table_name = 'order_financials';

  SELECT count(*) INTO v_members FROM public.members
  WHERE atelier_id = '11111111-1111-1111-1111-111111111111';

  ASSERT v_assigned >= 3, 'Artisan should see their assigned orders';
  ASSERT v_other_tenant = 0, 'Artisan intercepted another atelier';
  ASSERT v_other_measurements = 0, 'CRITICAL: Artisan intercepted another atelier''s measurements';
  ASSERT v_financials = 0, 'CRITICAL: Artisan can read order financials';
  ASSERT v_financial_audit = 0, 'CRITICAL: Artisan can read financial audit values';
  ASSERT v_members >= 4, 'Artisan should resolve patron/artisan names in their atelier';
  RAISE NOTICE 'PASS [3] artisan scope: assigned=%, otherOrders=%, otherMeasurements=%, financials=%, financialAudit=%, members=%',
    v_assigned, v_other_tenant, v_other_measurements, v_financials, v_financial_audit, v_members;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 4: PATRON SEES OWN RECORDS AND OWN BALANCE ONLY
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

DO $$
DECLARE
  v_own_measurement INT;
  v_other_client_measurement INT;
  v_own_orders INT;
  v_other_client_orders INT;
  v_own_appointments INT;
  v_other_client_appointments INT;
  v_own_financials INT;
  v_other_tenant_financials INT;
  v_financial_audit INT;
  v_client_rows INT;
  v_other_patron_row INT;
  v_staff_rows INT;
BEGIN
  SELECT count(*) INTO v_own_measurement FROM public.measurements
  WHERE client_id = 'a3333333-3333-3333-3333-333333333333';

  SELECT count(*) INTO v_other_client_measurement FROM public.measurements
  WHERE client_id = 'a4444444-4444-4444-4444-444444444444';

  SELECT count(*) INTO v_own_orders FROM public.orders
  WHERE client_id = 'a3333333-3333-3333-3333-333333333333';

  SELECT count(*) INTO v_other_client_orders FROM public.orders
  WHERE client_id = 'a4444444-4444-4444-4444-444444444444';

  SELECT count(*) INTO v_own_appointments FROM public.appointments
  WHERE client_id = 'a3333333-3333-3333-3333-333333333333';

  SELECT count(*) INTO v_other_client_appointments FROM public.appointments
  WHERE client_id = 'a4444444-4444-4444-4444-444444444444';

  SELECT count(*) INTO v_own_financials FROM public.order_financials
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE client_id = 'a3333333-3333-3333-3333-333333333333'
  );

  SELECT count(*) INTO v_other_tenant_financials FROM public.order_financials
  WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

  SELECT count(*) INTO v_financial_audit FROM public.audit_log
  WHERE table_name = 'order_financials';

  SELECT count(*) INTO v_client_rows FROM public.members
  WHERE role = 'client' AND atelier_id = '11111111-1111-1111-1111-111111111111';

  SELECT count(*) INTO v_other_patron_row FROM public.members
  WHERE id = 'a4444444-4444-4444-4444-444444444444';

  SELECT count(*) INTO v_staff_rows FROM public.members
  WHERE role IN ('owner', 'employee') AND atelier_id = '11111111-1111-1111-1111-111111111111';

  ASSERT v_own_measurement = 1, 'Patron must see their own measurement card';
  ASSERT v_other_client_measurement = 0, 'CRITICAL: Patron saw another patron measurement';
  ASSERT v_own_orders = 2, 'Patron must see their own orders';
  ASSERT v_other_client_orders = 0, 'CRITICAL: Patron saw another patron order';
  ASSERT v_own_appointments >= 1, 'Patron must see their own appointments';
  ASSERT v_other_client_appointments = 0, 'CRITICAL: Patron saw another patron appointment';
  ASSERT v_own_financials >= 2, 'Patron must see the balance on their own orders';
  ASSERT v_other_tenant_financials = 0, 'CRITICAL: Patron saw another tenant financials';
  ASSERT v_financial_audit = 0, 'CRITICAL: Patron can read financial audit values';
  -- A patron sees exactly one client row: their own. Never another patron.
  ASSERT v_client_rows = 1, 'CRITICAL: Patron client-directory visibility must be self only';
  ASSERT v_other_patron_row = 0, 'CRITICAL: Patron saw another patron member row';
  ASSERT v_staff_rows >= 2, 'Patron must resolve owner/employee names';
  RAISE NOTICE 'PASS [4] patron scope: measurements=%, orders=%, appointments=%, balances=%, clients=%, staff=%',
    v_own_measurement, v_own_orders, v_own_appointments, v_own_financials, v_client_rows, v_staff_rows;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 5: ANONYMOUS VISITOR PERIMETER
-- ----------------------------------------------------------------------------
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{}';

DO $$
DECLARE
  v_published INT;
  v_draft INT;
  v_orders INT;
  v_members INT;
  v_financials INT;
  v_ateliers INT;
BEGIN
  SELECT count(id) INTO v_published FROM public.lookbook_items;
  SELECT count(*) INTO v_draft FROM public.lookbook_items
  WHERE is_published = false;
  SELECT count(*) INTO v_orders FROM public.orders;
  SELECT count(*) INTO v_members FROM public.members;
  SELECT count(*) INTO v_financials FROM public.order_financials;
  SELECT count(id) INTO v_ateliers FROM public.ateliers;

  ASSERT v_published >= 3, 'Anonymous visitor should see published lookbook entries';
  ASSERT v_draft = 0, 'CRITICAL: Anonymous visitor saw an unpublished draft';
  ASSERT v_orders = 0, 'CRITICAL: Anonymous visitor read orders';
  ASSERT v_members = 0, 'CRITICAL: Anonymous visitor read the member directory';
  ASSERT v_financials = 0, 'CRITICAL: Anonymous visitor read financials';
  ASSERT v_ateliers >= 2, 'Anonymous visitor should read the public atelier profile';
  RAISE NOTICE 'PASS [5] public perimeter: published=%, drafts=%, orders=%, members=%, ateliers=%',
    v_published, v_draft, v_orders, v_members, v_ateliers;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 6: ANONYMOUS BOOKING WRITES STAY CLOSED UNTIL THE RATE-LIMITED EDGE PATH
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    INSERT INTO public.appointments (
      atelier_id, client_name, client_phone, service_type, slot_datetime, status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'Walk-in Patron', '+254700000001', 'grand_agbada',
      now() + interval '3 days', 'pending'
    );
    RAISE EXCEPTION 'expected anonymous pending-request denial';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.appointments (
      atelier_id, client_name, client_phone, service_type, slot_datetime, status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'Walk-in Patron',
      '+254700000001',
      'grand_agbada',
      now() + interval '4 days',
      'confirmed'
    );
    RAISE EXCEPTION 'expected anonymous confirmed-booking denial';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'PASS [6] anonymous appointment writes denied pending rate-limited edge boundary';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 7: TENANT A OWNER CANNOT UPDATE TENANT B ORDERS
-- ----------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

DO $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.orders SET status = 'ready'
  WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  ASSERT v_updated = 0, 'CRITICAL: Tenant A updated Tenant B orders';
  RAISE NOTICE 'PASS [7] cross-tenant order update: rows mutated=%', v_updated;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 8: CROSS-TENANT INSERT IS REJECTED
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    INSERT INTO public.orders (
      atelier_id, order_code, client_id, status, description, garment_type, fabric_details
    ) VALUES (
      '22222222-2222-2222-2222-222222222222',
      'HACK-001',
      'b3333333-3333-3333-3333-333333333333',
      'cutting',
      'Cross-tenant injection attempt',
      'Injected Garment',
      'Injected Fabric'
    );
    RAISE EXCEPTION 'expected cross-tenant insert denial';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'PASS [8] cross-tenant insert denied by WITH CHECK';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 9: A PATRON CANNOT ESCALATE THEIR OWN ROLE
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

DO $$
BEGIN
  BEGIN
    UPDATE public.members SET role = 'owner'
    WHERE id = 'a3333333-3333-3333-3333-333333333333';
    RAISE EXCEPTION 'expected role escalation denial';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%expected role escalation denial%' THEN
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'PASS [9] patron self role escalation blocked';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 10: DEACTIVATED MEMBERS LOSE ACCESS IMMEDIATELY
-- Deactivation is performed by the atelier owner, the only role permitted to
-- change `active`. A superuser write is not the product path and must not be
-- used to fake this scenario.
-- ----------------------------------------------------------------------------
RESET ROLE;
SET LOCAL "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_rows INT;
BEGIN
  UPDATE public.members SET active = false
  WHERE id = 'a2222222-2222-2222-2222-222222222222';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  ASSERT v_rows = 1, 'Owner must be able to deactivate a member in their atelier';
END $$;

SET LOCAL "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

DO $$
DECLARE
  v_orders INT;
  v_measurements INT;
BEGIN
  SELECT count(*) INTO v_orders FROM public.orders;
  SELECT count(*) INTO v_measurements FROM public.measurements;

  ASSERT v_orders = 0, 'CRITICAL: Deactivated artisan still reads orders';
  ASSERT v_measurements = 0, 'CRITICAL: Deactivated artisan still reads measurements';
  RAISE NOTICE 'PASS [10] deactivated member access revoked: orders=%, measurements=%',
    v_orders, v_measurements;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 11: A PATRON CANNOT WRITE AN ORDER, A BALANCE, OR A MEASUREMENT
-- Verification gate 5 from supabase/README.md. Client policies are read-only;
-- every attempted write must affect zero rows rather than silently succeed.
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

DO $$
DECLARE
  v_orders INT;
  v_financials INT;
  v_measurements INT;
BEGIN
  UPDATE public.orders SET status = 'ready'
  WHERE atelier_id = '11111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  UPDATE public.order_financials SET balance_due = 0
  WHERE atelier_id = '11111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS v_financials = ROW_COUNT;

  UPDATE public.measurements SET chest = 1
  WHERE client_id = 'a3333333-3333-3333-3333-333333333333';
  GET DIAGNOSTICS v_measurements = ROW_COUNT;

  ASSERT v_orders = 0, 'CRITICAL: Patron updated an order';
  ASSERT v_financials = 0, 'CRITICAL: Patron wrote a balance';
  ASSERT v_measurements = 0, 'CRITICAL: Patron wrote a measurement card';
  RAISE NOTICE 'PASS [11] patron write denial: orders=%, financials=%, measurements=%',
    v_orders, v_financials, v_measurements;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 12: A TENANT ID CANNOT BE CHANGED THROUGH AN UPDATE PAYLOAD
-- Verification gate 6 from supabase/README.md. Tenant moves must be stopped by
-- a trigger or a WITH CHECK, never by trusting the client to omit the column.
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

DO $$
DECLARE
  v_blocked INT := 0;
  v_rows INT;
BEGIN
  BEGIN
    UPDATE public.orders
    SET atelier_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'a1000001-1111-1111-1111-111111111111';
    RAISE EXCEPTION 'expected order tenant reassignment denial';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%expected order tenant reassignment denial%' THEN
        RAISE;
      END IF;
      v_blocked := v_blocked + 1;
  END;

  BEGIN
    UPDATE public.members
    SET atelier_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'a3333333-3333-3333-3333-333333333333';
    RAISE EXCEPTION 'expected member tenant reassignment denial';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%expected member tenant reassignment denial%' THEN
        RAISE;
      END IF;
      v_blocked := v_blocked + 1;
  END;

  BEGIN
    UPDATE public.measurements
    SET atelier_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'a0000001-1111-1111-1111-111111111111';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
      RAISE EXCEPTION 'expected measurement tenant reassignment denial';
    END IF;
    v_blocked := v_blocked + 1;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_blocked := v_blocked + 1;
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%expected measurement tenant reassignment denial%' THEN
        RAISE;
      END IF;
      v_blocked := v_blocked + 1;
  END;

  ASSERT v_blocked = 3, 'CRITICAL: A tenant_id mutation was not blocked';
  RAISE NOTICE 'PASS [12] tenant-id mutation guards: blocked=%', v_blocked;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 13: A PATRON CAN ONLY FILE A PENDING REQUEST FOR THEMSELVES
-- ----------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

DO $$
DECLARE
  v_inserted uuid;
BEGIN
  INSERT INTO public.appointments (
    atelier_id, client_id, client_name, client_phone, service_type, slot_datetime, status
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor', '+254733445566', 'grand_agbada', now() + interval '5 days', 'pending'
  ) RETURNING id INTO v_inserted;
  ASSERT v_inserted IS NOT NULL, 'patron should be able to file their own pending request';

  BEGIN
    INSERT INTO public.appointments (
      atelier_id, client_id, client_name, client_phone, service_type, slot_datetime, status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'a3333333-3333-3333-3333-333333333333',
      'Dr. Zainab Al-Mansoor', '+254733445566', 'grand_agbada', now() + interval '6 days', 'confirmed'
    );
    RAISE EXCEPTION 'expected patron confirmed request denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.appointments (
      atelier_id, client_id, client_name, client_phone, service_type, slot_datetime, status,
      assigned_tailor_id
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'a3333333-3333-3333-3333-333333333333',
      'Dr. Zainab Al-Mansoor', '+254733445566', 'grand_agbada', now() + interval '7 days', 'pending',
      'a1111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected patron assigned-tailor denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.appointments (
      atelier_id, client_id, client_name, client_phone, service_type, slot_datetime, status
    ) VALUES (
      '22222222-2222-2222-2222-222222222222',
      'a3333333-3333-3333-3333-333333333333',
      'Dr. Zainab Al-Mansoor', '+254733445566', 'grand_agbada', now() + interval '8 days', 'pending'
    );
    RAISE EXCEPTION 'expected patron cross-tenant request denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'PASS [13] patron appointment insert is own-tenant pending request only';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 14: STAFF CANNOT USE THE PATRON REQUEST INSERT POLICY
-- ----------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.appointments (
      atelier_id, client_id, client_name, client_phone, service_type, slot_datetime, status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'a1111111-1111-1111-1111-111111111111',
      'Chief Tailor', '+254700000099', 'grand_agbada', now() + interval '9 days', 'pending'
    );
    RAISE EXCEPTION 'expected owner appointment insert denial';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'PASS [14] owner cannot use patron pending-request insert policy';
END $$;

ROLLBACK;
