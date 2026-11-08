-- ============================================================================
-- STITCHFLOW LOCAL / PILOT SEED
-- ----------------------------------------------------------------------------
-- Seed data lives here, not in a schema migration, because it depends on
-- auth.users rows that only exist after the auth schema is provisioned.
-- Run automatically by `supabase db reset`, or by `npm run verify:db`.
--
-- Tenant A: StitchFlow Atelier Nairobi (Kenya - KES)
-- Tenant B: Aso-Oke Heritage House Lagos (Nigeria - NGN)
--
-- No passwords are seeded. Sign in locally with a magic link through Mailpit.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUTH USERS (deterministic identities for local verification)
-- ----------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('a1111111-1111-1111-1111-111111111111', 'danny@stitchflow.ke', now(), '{"full_name":"Danny Muhoro"}'::jsonb),
  ('a2222222-2222-2222-2222-222222222222', 'amani@stitchflow.ke', now(), '{"full_name":"Amani Wanjiru"}'::jsonb),
  ('a3333333-3333-3333-3333-333333333333', 'zainab@diplomacy.org', now(), '{"full_name":"Dr. Zainab Al-Mansoor"}'::jsonb),
  ('a4444444-4444-4444-4444-444444444444', 'njeri@wanjiku.co.ke', now(), '{"full_name":"Njeri Wambui"}'::jsonb),
  ('b1111111-1111-1111-1111-111111111111', 'adeleke@heritageasooke.ng', now(), '{"full_name":"Chief Babatunde Adeleke"}'::jsonb),
  ('b2222222-2222-2222-2222-222222222222', 'folake@heritageasooke.ng', now(), '{"full_name":"Folake Adeleke"}'::jsonb),
  ('b3333333-3333-3333-3333-333333333333', 'oladipo@senate.gov.ng', now(), '{"full_name":"Senator Oladipo Williams"}'::jsonb)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. ATELIERS
-- ----------------------------------------------------------------------------
insert into public.ateliers (
  id, name, slug, tagline, city, country, default_currency,
  phone, whatsapp_number, default_unit, created_by
)
values
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
  'in',
  'a1111111-1111-1111-1111-111111111111'
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
  'in',
  'b1111111-1111-1111-1111-111111111111'
)
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  whatsapp_number = excluded.whatsapp_number,
  default_currency = excluded.default_currency,
  created_by = excluded.created_by;

-- ----------------------------------------------------------------------------
-- 3. MEMBERS
-- ----------------------------------------------------------------------------
insert into public.members (
  id, atelier_id, role, full_name, phone, email, avatar_url, specialty, title, active
)
values
(
  'a1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'owner',
  'Danny Muhoro',
  '+254712345678',
  'danny@stitchflow.ke',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'Creative Director & Master Silhouette Drafter',
  'Creative Director',
  true
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
  'Master Artisan',
  true
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
  'VIP Patron',
  true
),
(
  'a4444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'client',
  'Njeri Wambui',
  '+254701112233',
  'njeri@wanjiku.co.ke',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'Ruracio Bride & Cultural Patron',
  'Patron',
  true
),
(
  'b1111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'owner',
  'Chief Babatunde Adeleke',
  '+2348039876543',
  'adeleke@heritageasooke.ng',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'Managing Partner & Aso-Oke Master Weaver',
  'Managing Partner',
  true
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
  'Master Artisan',
  true
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
  'VIP Patron',
  true
)
on conflict (id) do update set
  atelier_id = excluded.atelier_id,
  role = excluded.role,
  full_name = excluded.full_name,
  title = excluded.title,
  active = excluded.active;

-- ----------------------------------------------------------------------------
-- 4. MEASUREMENTS (African haute couture dimensions preserved)
-- ----------------------------------------------------------------------------
insert into public.measurements (
  id, atelier_id, client_id, unit,
  chest, waist, hips, length, sleeve, shoulder, inseam, neck,
  agbada_wingspan, sokoto_inseam, fila_cap_head, buba_chest,
  posture_notes, verified_at
)
values
(
  'a0000001-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'a3333333-3333-3333-3333-333333333333',
  'in',
  38.5, 31.0, 42.5, 59.0, 24.5, 16.0, 31.5, 14.5,
  64.0, 32.0, 22.0, 40.0,
  'Slight right shoulder drop (0.5cm). Prefers structured corsetry with interior bone support.',
  now()
),
(
  'a0000002-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'a4444444-4444-4444-4444-444444444444',
  'in',
  36.0, 29.5, 40.0, 57.0, 23.0, 15.5, 30.0, 13.5,
  60.0, 30.5, 21.5, 37.5,
  'Ruracio bridal client. Prefers a raised waistline and cowrie-shell neckline.',
  now()
),
(
  'b0000001-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'b3333333-3333-3333-3333-333333333333',
  'in',
  46.0, 42.0, 45.0, 56.0, 26.0, 20.5, 33.0, 18.0,
  72.5, 34.0, 23.5, 48.0,
  'Grand stature. Extra Agbada wingspan required to achieve ceremonial folds without tension.',
  now()
)
on conflict (id) do update set
  posture_notes = excluded.posture_notes,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 5. ORDERS + FINANCIALS
-- ----------------------------------------------------------------------------
insert into public.orders (
  id, atelier_id, order_code, client_id, assigned_tailor_id, status,
  description, garment_type, fabric_details, estimated_delivery, photo_url
)
values
(
  'a1000001-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'ORD-892',
  'a3333333-3333-3333-3333-333333333333',
  'a2222222-2222-2222-2222-222222222222',
  'stitching',
  'Ruracio Ceremonial Kitenge corseted mermaid gown with train and metallic threadwork.',
  'Bridal Kitenge Haute Couture',
  'Original Vlisco Holland Wax (Emerald & Gold Leaf) with silk organza backing',
  current_date + interval '5 days',
  'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80'
),
(
  'a1000002-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'ORD-893',
  'a3333333-3333-3333-3333-333333333333',
  'a2222222-2222-2222-2222-222222222222',
  'fitting',
  'Swahili Silk Kanzu with Hand-embroidered Placket and matching ceremonial Bisht.',
  'Swahili Coastal Kanzu',
  'Pure Egyptian Cotton Damask with Gold Bullion Thread',
  current_date + interval '2 days',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'
),
(
  'a1000003-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'ORD-894',
  'a4444444-4444-4444-4444-444444444444',
  'a2222222-2222-2222-2222-222222222222',
  'cutting',
  'Agikuyu Ruracio ceremonial attire with beaded collar and earth-tone linen drape.',
  'Kikuyu Ceremonial Bridal',
  'Tanned Earth Linen, Calfskin & Hand-Strung Glass Beadwork',
  current_date + interval '12 days',
  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80'
),
(
  'b1000001-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'LAG-401',
  'b3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'cutting',
  '4-Piece Royal Alaari Aso-Oke Grand Agbada with embroidered breast pocket and tailored Sokoto.',
  'Royal Yoruba Grand Agbada',
  'Handwoven Metallic Alaari Aso-Oke with Heavy Cord Embroidery',
  current_date + interval '10 days',
  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80'
)
on conflict (id) do update set
  status = excluded.status,
  estimated_delivery = excluded.estimated_delivery;

insert into public.order_financials (order_id, atelier_id, deposit_amount, balance_due, currency)
values
  ('a1000001-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 45000.00, 25000.00, 'KES'),
  ('a1000002-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 32000.00, 18000.00, 'KES'),
  ('a1000003-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 30000.00, 25000.00, 'KES'),
  ('b1000001-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 350000.00, 150000.00, 'NGN')
on conflict (order_id) do update set
  deposit_amount = excluded.deposit_amount,
  balance_due = excluded.balance_due,
  currency = excluded.currency;

insert into public.order_progress_notes (id, order_id, stage, note, author_id)
values
  (
    'a2000001-1111-1111-1111-111111111111',
    'a1000001-1111-1111-1111-111111111111',
    'cutting',
    'Vlisco Hollandais wax aligned on the straight grain; corset panels chalked.',
    'a2222222-2222-2222-2222-222222222222'
  ),
  (
    'a2000002-1111-1111-1111-111111111111',
    'a1000001-1111-1111-1111-111111111111',
    'stitching',
    'Chain-stitch embroidery applied to the chest placket. Organza underlay set.',
    'a2222222-2222-2222-2222-222222222222'
  )
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 5b. BOOKING RESOURCES AND STAFF AVAILABILITY
-- ----------------------------------------------------------------------------
-- The staff booking workspace is only usable when the atelier publishes at
-- least one resource with a working window. These are pilot fixtures, not
-- schema defaults: a real atelier owns and edits its own rows.
insert into public.booking_resources (
  id, atelier_id, kind, display_name, capacity, timezone, active
)
values
(
  'a6000001-0001-4001-8001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'cutter',
  'Master Cutter Bench — Agbada & Boubou',
  1,
  'Africa/Nairobi',
  true
),
(
  'a6000002-0002-4002-8002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'fitting_room',
  'Bridal & Ceremonial Fitting Room',
  1,
  'Africa/Nairobi',
  true
),
(
  'b6000001-0001-4001-8001-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'cutter',
  'Aso-Oke Master Loom Bench',
  1,
  'Africa/Lagos',
  true
),
(
  'b6000002-0002-4002-8002-000000000002',
  '22222222-2222-2222-2222-222222222222',
  'fitting_room',
  'Royal Agbada Fitting Room',
  1,
  'Africa/Lagos',
  true
)
on conflict (id) do update set
  display_name = excluded.display_name,
  timezone = excluded.timezone,
  active = excluded.active;

-- Monday–Saturday, 09:00–18:00 local wall clock. Sunday is intentionally
-- closed; a request for Sunday returns no slots rather than a silent default.
insert into public.resource_availability_rules (
  atelier_id, resource_id, weekday, starts_at, ends_at
)
select r.atelier_id, r.id, w, '09:00'::time, '18:00'::time
from public.booking_resources r
cross join generate_series(1, 6) as w
where r.id in (
  'a6000001-0001-4001-8001-000000000001',
  'a6000002-0002-4002-8002-000000000002',
  'b6000001-0001-4001-8001-000000000001',
  'b6000002-0002-4002-8002-000000000002'
)
  and not exists (
    select 1
    from public.resource_availability_rules existing
    where existing.resource_id = r.id
      and existing.weekday = w
      and existing.starts_at = '09:00'::time
      and existing.ends_at = '18:00'::time
  );

-- ----------------------------------------------------------------------------
-- 6. APPOINTMENTS
-- ----------------------------------------------------------------------------
insert into public.appointments (
  id, atelier_id, client_id, client_name, client_phone, client_email,
  service_type, slot_datetime, status, assigned_tailor_id,
  cultural_occasion, notes
)
values
(
  'a3000001-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'a3333333-3333-3333-3333-333333333333',
  'Dr. Zainab Al-Mansoor',
  '+254733445566',
  'zainab@diplomacy.org',
  'ruracio_bridal',
  now() + interval '1 day 4 hours',
  'confirmed',
  'a2222222-2222-2222-2222-222222222222',
  'Ruracio Traditional Dowry Introduction Ceremony',
  'Client bringing mother for lace underlay selection'
),
(
  'b3000001-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'b3333333-3333-3333-3333-333333333333',
  'Senator Oladipo Williams',
  '+2348098877665',
  'oladipo@senate.gov.ng',
  'grand_agbada',
  now() + interval '2 days 6 hours',
  'confirmed',
  'b2222222-2222-2222-2222-222222222222',
  'Coronation Anniversary Banquet',
  'Private VIP fitting room requested with bespoke champagne setup'
),
-- Public requests with no account attached. These are the staff inbox fixture:
-- they are pending until a staff member confirms them into a resource slot.
(
  'a3000002-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  null,
  'Wanjiru Mwangi',
  '+254711223344',
  'wanjiru.mwangi@example.ke',
  'basted_fitting',
  now() + interval '3 days',
  'pending',
  null,
  'Ruracio bridal basted fitting',
  'Public request submitted from the Nairobi lookbook. Wants a Saturday morning fitting.'
),
(
  'b3000002-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  null,
  'Yewande Ogunleye',
  '+2348023344556',
  'yewande.ogunleye@example.ng',
  'kitenge_wax_styling',
  now() + interval '4 days',
  'pending',
  null,
  'Kitenge wax styling consultation',
  'Public request submitted from the Lagos lookbook. Asks about matching gele and ipele.'
)
on conflict (id) do update set
  status = excluded.status,
  slot_datetime = excluded.slot_datetime;

-- ----------------------------------------------------------------------------
-- 7. FEEDBACK
-- ----------------------------------------------------------------------------
insert into public.feedback (
  id, atelier_id, order_id, client_id, rating, fit_rating, comments, resolution_status
)
values
(
  'a4000001-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'a1000002-1111-1111-1111-111111111111',
  'a3333333-3333-3333-3333-333333333333',
  5,
  'perfect',
  'The Kanzu placket embroidery is exquisite and the Bisht drape sits beautifully.',
  'resolved'
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 8. LOOKBOOK
-- ----------------------------------------------------------------------------
insert into public.lookbook_items (
  id, atelier_id, title, category, description, fabric, price_range,
  turnaround_days, image_url, cultural_origin, tags, is_featured, is_published
)
values
(
  'a5000001-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Imperial 3-Piece Grand Agbada',
  'Grand Agbada & Boubou',
  'Monumental royal silhouette in hand-dyed damask with signature chest embroidery and structured shoulder drape.',
  'Heavy Guinean Brocade & Gold Thread',
  'KES 48,000 - 75,000',
  14,
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
  'Yoruba / West African Royal Court',
  array['Agbada', 'Bespoke', 'Gala', 'Heritage'],
  true,
  true
),
(
  'a5000002-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Bespoke Nairobi Senator Suit',
  'Senator Suits & Kaftans',
  'Slim-tailored monochromatic kaftan with asymmetrical front buttoning, matching trousers, and pocket embellishment.',
  'Super 150s Tropical Wool Blend',
  'KES 24,000 - 38,000',
  7,
  'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
  'Modern Niger Delta / Pan-African Executive',
  array['Senator', 'Executive', 'Modern', 'Minimalist'],
  true,
  true
),
(
  'b5000001-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'Royal Alaari Aso-Oke Ceremonial Regalia',
  'Grand Agbada & Boubou',
  'Hand-loomed magenta and gold strip-woven Aso-Oke with artisanal openwork perforations and matching Gobi cap.',
  'Ancestral Hand-Loomed Alaari Cotton & Silk',
  'NGN 450,000 - 800,000',
  21,
  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
  'Yoruba Ancestral High Royalty',
  array['Aso-Oke', 'Alaari', 'Royal', 'Coronation'],
  true,
  true
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  is_published = excluded.is_published,
  updated_at = now();
