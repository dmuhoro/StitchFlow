-- ============================================================================
-- STITCHFLOW SEED DATA: MULTI-TENANT ATELIER VERIFICATION
-- Tenant A: StitchFlow Atelier Nairobi (Kenya - KES)
-- Tenant B: Aso-Oke Heritage House Lagos (Nigeria - NGN)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEED ATELIERS (TENANT A & TENANT B)
-- ----------------------------------------------------------------------------
INSERT INTO public.ateliers (id, name, slug, tagline, city, country, currency, phone, whatsapp, default_unit)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'StitchFlow Atelier Nairobi',
    'stitchflow-nairobi',
    'Haute Couture Pan-African Tailoring & Royal Bespoke Regalia',
    'Nairobi',
    'Kenya',
    'KES',
    '+254712345678',
    '+254712345678',
    'in'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Aso-Oke Heritage House Lagos',
    'asooke-lagos',
    'Ancestral Weaves & Luxury Yoruba Ceremonial Agbada',
    'Lagos',
    'Nigeria',
    'NGN',
    '+2348039876543',
    '+2348039876543',
    'in'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ----------------------------------------------------------------------------
-- 2. SEED PROFILES (Tenant A & Tenant B)
-- ----------------------------------------------------------------------------
-- Note: In production auth.users, user records are created first.
-- In migration seed, we insert into profiles using deterministic UUIDs.
INSERT INTO public.profiles (id, atelier_id, role, full_name, phone, email, avatar_url, specialty, passkey)
VALUES
-- Tenant A (Nairobi)
(
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'owner',
    'Danny Muhoro',
    '+254712345678',
    'danny@stitchflow.ke',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'Creative Director & Master Silhouette Drafter',
    'DIRECTOR-01'
),
(
    'a2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'employee',
    'Amani Wanjiru',
    '+254722998877',
    'amani@stitchflow.ke',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80',
    'Senior Couturier & Pattern Master',
    'AMANI-88'
),
(
    'a3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'client',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    'zainab@diplomacy.org',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    'Diplomatic Envoy & Cultural Collector',
    'ZAINAB-VIP'
),
-- Tenant B (Lagos)
(
    'b1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'owner',
    'Chief Babatunde Adeleke',
    '+2348039876543',
    'adeleke@heritageasooke.ng',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'Managing Partner & Aso-Oke Master Weaver',
    'CHIEF-01'
),
(
    'b2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'employee',
    'Folake Adeleke',
    '+2348021122334',
    'folake@heritageasooke.ng',
    'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
    'Gele Sculptor & Zari Embroidery Specialist',
    'FOLAKE-77'
),
(
    'b3333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'client',
    'Senator Oladipo Williams',
    '+2348098877665',
    'oladipo@senate.gov.ng',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    'State Patron & Ceremonial Dignitary',
    'SENATOR-99'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. SEED MEASUREMENTS (Tenant A & Tenant B Isolated)
-- ----------------------------------------------------------------------------
-- Tenant A (Nairobi Client: Dr. Zainab Al-Mansoor)
INSERT INTO public.measurements (
    id, atelier_id, client_id, client_name, phone, unit,
    chest, waist, hips, length, sleeve, shoulder, inseam, neck,
    agbada_wingspan, sokoto_inseam, fila_cap_head, buba_chest,
    posture_notes
)
VALUES (
    'm1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    'in',
    38.5, 31.0, 42.5, 59.0, 24.5, 16.0, 31.5, 14.5,
    64.0, 32.0, 22.0, 40.0,
    'Slight right shoulder drop (0.5cm). Prefers structured corsetry with interior bone support.'
)
ON CONFLICT (id) DO NOTHING;

-- Tenant B (Lagos Client: Senator Oladipo Williams)
INSERT INTO public.measurements (
    id, atelier_id, client_id, client_name, phone, unit,
    chest, waist, hips, length, sleeve, shoulder, inseam, neck,
    agbada_wingspan, sokoto_inseam, fila_cap_head, buba_chest,
    posture_notes
)
VALUES (
    'm2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'Senator Oladipo Williams',
    '+2348098877665',
    'in',
    46.0, 42.0, 45.0, 56.0, 26.0, 20.5, 33.0, 18.0,
    72.5, 34.0, 23.5, 48.0,
    'Grand stature. Extra Agbada wingspan required to achieve ceremonial folds without tension.'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. SEED ORDERS (Tenant A & Tenant B Isolated)
-- ----------------------------------------------------------------------------
-- Tenant A (Nairobi Orders)
INSERT INTO public.orders (
    id, atelier_id, order_number, client_id, client_name, client_phone,
    assigned_tailor_id, assigned_tailor_name, status, description,
    garment_type, fabric_details, estimated_delivery,
    deposit_amount, balance_due, currency, photo_url
)
VALUES
(
    'o1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'ORD-892',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    'a2222222-2222-2222-2222-222222222222',
    'Amani Wanjiru',
    'stitching',
    'Ruracio Ceremonial Kitenge corseted mermaid gown with train and metallic threadwork.',
    'Bridal Kitenge Haute Couture',
    'Original Vlisco Holland Wax (Emerald & Gold Leaf) with silk organza backing',
    CURRENT_DATE + INTERVAL '5 days',
    45000.00,
    25000.00,
    'KES',
    'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80'
),
(
    'o1111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'ORD-893',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    'a2222222-2222-2222-2222-222222222222',
    'Amani Wanjiru',
    'fitting',
    'Swahili Silk Kanzu with Hand-embroidered Placket and matching ceremonial Bisht.',
    'Swahili Coastal Kanzu',
    'Pure Egyptian Cotton Damask with Gold Bullion Thread',
    CURRENT_DATE + INTERVAL '2 days',
    32000.00,
    18000.00,
    'KES',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'
)
ON CONFLICT (id) DO NOTHING;

-- Tenant B (Lagos Orders)
INSERT INTO public.orders (
    id, atelier_id, order_number, client_id, client_name, client_phone,
    assigned_tailor_id, assigned_tailor_name, status, description,
    garment_type, fabric_details, estimated_delivery,
    deposit_amount, balance_due, currency, photo_url
)
VALUES
(
    'o2222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222222',
    'LAG-401',
    'b3333333-3333-3333-3333-333333333333',
    'Senator Oladipo Williams',
    '+2348098877665',
    'b2222222-2222-2222-2222-222222222222',
    'Folake Adeleke',
    'cutting',
    '4-Piece Royal Alaari Aso-Oke Grand Agbada with embroidered breast pocket and tailored Sokoto.',
    'Royal Yoruba Grand Agbada',
    'Handwoven Metallic Alaari Aso-Oke with Heavy Cord Embroidery',
    CURRENT_DATE + INTERVAL '10 days',
    350000.00,
    150000.00,
    'NGN',
    'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. SEED APPOINTMENTS
-- ----------------------------------------------------------------------------
-- Tenant A
INSERT INTO public.appointments (
    id, atelier_id, client_id, client_name, client_phone, client_email,
    service_type, slot_datetime, status, assigned_tailor_id, cultural_occasion, notes
)
VALUES (
    'ap111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'a3333333-3333-3333-3333-333333333333',
    'Dr. Zainab Al-Mansoor',
    '+254733445566',
    'zainab@diplomacy.org',
    'ruracio_bridal',
    NOW() + INTERVAL '1 day 4 hours',
    'confirmed',
    'a2222222-2222-2222-2222-222222222222',
    'Ruracio Traditional Dowry Introduction Ceremony',
    'Client bringing mother for lace underlay selection'
)
ON CONFLICT (id) DO NOTHING;

-- Tenant B
INSERT INTO public.appointments (
    id, atelier_id, client_id, client_name, client_phone, client_email,
    service_type, slot_datetime, status, assigned_tailor_id, cultural_occasion, notes
)
VALUES (
    'ap222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'Senator Oladipo Williams',
    '+2348098877665',
    'oladipo@senate.gov.ng',
    'grand_agbada',
    NOW() + INTERVAL '2 days 6 hours',
    'confirmed',
    'b2222222-2222-2222-2222-222222222222',
    'Coronation Anniversary Banquet',
    'Private VIP fitting room requested with bespoke champagne setup'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SEED LOOKBOOK ITEMS
-- ----------------------------------------------------------------------------
-- Tenant A Lookbook
INSERT INTO public.lookbook_items (
    id, atelier_id, title, category, description, fabric, price_range,
    turnaround_days, image_url, cultural_origin, tags, is_featured, published
)
VALUES
(
    'lb111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Imperial 3-Piece Grand Agbada',
    'Grand Agbada & Boubou',
    'Monumental royal silhouette in hand-dyed damask with signature chest embroidery and structured shoulder drape.',
    'Heavy Guinean Brocade & Gold Thread',
    'KES 48,000 - 75,000',
    14,
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
    'Yoruba / West African Royal Court',
    ARRAY['Agbada', 'Bespoke', 'Gala', 'Heritage'],
    true,
    true
),
(
    'lb111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'Bespoke Nairobi Senator Suit',
    'Senator Suits & Kaftans',
    'Slim-tailored monochromatic kaftan with asymmetrical front buttoning, matching trousers, and pocket embellishment.',
    'Super 150s Tropical Wool Blend',
    'KES 24,000 - 38,000',
    7,
    'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
    'Modern Niger Delta / Pan-African Executive',
    ARRAY['Senator', 'Executive', 'Modern', 'Minimalist'],
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Tenant B Lookbook
INSERT INTO public.lookbook_items (
    id, atelier_id, title, category, description, fabric, price_range,
    turnaround_days, image_url, cultural_origin, tags, is_featured, published
)
VALUES
(
    'lb222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222222',
    'Royal Alaari Aso-Oke Ceremonial Regalia',
    'Grand Agbada & Boubou',
    'Hand-loomed magenta and gold strip-woven Aso-Oke with artisanal openwork perforations and matching Gobi cap.',
    'Ancestral Hand-Loomed Alaari Cotton & Silk',
    'NGN 450,000 - 800,000',
    21,
    'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
    'Yoruba Ancestral High Royalty',
    ARRAY['Aso-Oke', 'Alaari', 'Royal', 'Coronation'],
    true,
    true
)
ON CONFLICT (id) DO NOTHING;
