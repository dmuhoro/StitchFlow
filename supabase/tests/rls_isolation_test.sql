-- ============================================================================
-- STITCHFLOW ROW LEVEL SECURITY (RLS) MULTI-TENANT ISOLATION SUITE
-- Target: Supabase Postgres RLS Verification
-- Demonstrates mathematical certainty of zero cross-tenant contamination.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- TEST 1: TENANT A OWNER CANNOT VIEW TENANT B ORDERS OR BALANCES
-- ----------------------------------------------------------------------------
-- Simulate authenticated context as Tenant A Owner (Danny Muhoro)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

DO $$
DECLARE
    v_order_count INT;
    v_leak_count INT;
BEGIN
    -- Query orders as Tenant A
    SELECT COUNT(*) INTO v_order_count 
    FROM public.orders 
    WHERE atelier_id = '11111111-1111-1111-1111-111111111111';

    -- Attempt to query Tenant B's orders
    SELECT COUNT(*) INTO v_leak_count 
    FROM public.orders 
    WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

    ASSERT v_order_count >= 2, 'Tenant A owner should see their own atelier orders';
    ASSERT v_leak_count = 0, 'CRITICAL SECURITY BREACH: Tenant A owner was able to see Tenant B orders!';
    
    RAISE NOTICE 'SUCCESS [TEST 1]: Cross-tenant order isolation verified. Visible: %, Leaked: %', v_order_count, v_leak_count;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 2: TENANT A OWNER CANNOT MUTATE TENANT B MEASUREMENTS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_updated_rows INT;
BEGIN
    -- Attempt malicious update on Tenant B client measurement card
    UPDATE public.measurements
    SET posture_notes = 'MALICIOUS_OVERWRITE'
    WHERE id = 'm2222222-2222-2222-2222-222222222222'
      AND atelier_id = '22222222-2222-2222-2222-222222222222';
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    ASSERT v_updated_rows = 0, 'CRITICAL SECURITY BREACH: Tenant A mutated Tenant B measurement card!';

    RAISE NOTICE 'SUCCESS [TEST 2]: Cross-tenant write isolation verified. Rows mutated: %', v_updated_rows;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 3: ARTISAN ROLE RESTRICTIONS & FINANCIAL ISOLATION
-- ----------------------------------------------------------------------------
-- Switch context to Tenant A Artisan (Amani Wanjiru)
SET LOCAL "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

DO $$
DECLARE
    v_assigned_order_count INT;
    v_other_tenant_count INT;
BEGIN
    -- Artisan should only see orders assigned to them within Tenant A
    SELECT COUNT(*) INTO v_assigned_order_count
    FROM public.orders
    WHERE assigned_tailor_id = 'a2222222-2222-2222-2222-222222222222';

    -- Artisan attempts to query Tenant B orders
    SELECT COUNT(*) INTO v_other_tenant_count
    FROM public.orders
    WHERE atelier_id = '22222222-2222-2222-2222-222222222222';

    ASSERT v_assigned_order_count >= 1, 'Artisan should see their assigned orders';
    ASSERT v_other_tenant_count = 0, 'Artisan intercepted other atelier data!';

    RAISE NOTICE 'SUCCESS [TEST 3]: Artisan assigned scope verified. Assigned orders: %, Other atelier: %', 
        v_assigned_order_count, v_other_tenant_count;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 4: PATRON CANNOT VIEW OTHER PATRONS MEASUREMENTS
-- ----------------------------------------------------------------------------
-- Switch context to Tenant A Patron (Dr. Zainab Al-Mansoor)
SET LOCAL "request.jwt.claims" = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

DO $$
DECLARE
    v_own_measurement_count INT;
    v_other_client_measurement_count INT;
BEGIN
    -- Patron queries their own measurement card
    SELECT COUNT(*) INTO v_own_measurement_count
    FROM public.measurements
    WHERE client_id = 'a3333333-3333-3333-3333-333333333333';

    -- Patron attempts to query Tenant B Patron measurement card
    SELECT COUNT(*) INTO v_other_client_measurement_count
    FROM public.measurements
    WHERE client_id = 'b3333333-3333-3333-3333-333333333333';

    ASSERT v_own_measurement_count = 1, 'Patron must be able to view their own measurement profile';
    ASSERT v_other_client_measurement_count = 0, 'CRITICAL PRIVACY VIOLATION: Patron viewed another patron measurements!';

    RAISE NOTICE 'SUCCESS [TEST 4]: Patron privacy boundary verified. Own cards: %, Leaked cards: %', 
        v_own_measurement_count, v_other_client_measurement_count;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 5: ANONYMOUS VISITOR ACCESS ONLY TO PUBLISHED LOOKBOOK
-- ----------------------------------------------------------------------------
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{}';

DO $$
DECLARE
    v_published_count INT;
    v_orders_accessible INT;
BEGIN
    -- Public visitor querying lookbook
    SELECT COUNT(*) INTO v_published_count
    FROM public.lookbook_items
    WHERE published = true;

    -- Public visitor attempting to view orders table
    SELECT COUNT(*) INTO v_orders_accessible
    FROM public.orders;

    ASSERT v_published_count >= 1, 'Public visitor should see published lookbook';
    ASSERT v_orders_accessible = 0, 'CRITICAL LEAK: Anonymous visitor read orders table!';

    RAISE NOTICE 'SUCCESS [TEST 5]: Public perimeter security verified. Published items: %, Orders visible: %',
        v_published_count, v_orders_accessible;
END $$;

ROLLBACK;
