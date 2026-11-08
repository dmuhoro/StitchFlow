#!/usr/bin/env node
/**
 * ============================================================================
 * PILOT SEED — one supervised atelier, one isolation tenant, and one fitting fixture
 * ----------------------------------------------------------------------------
 * Creates the hosted pilot identities through the Supabase Admin API (not raw
 * `auth.users` inserts: password sign-in needs `auth.identities` and a hashed
 * credential, which only GoTrue writes correctly) and then seeds tenant data
 * through the Management API.
 *
 * Why a script instead of `supabase/seed.sql`: that file seeds a LOCAL database
 * and deliberately has no passwords. Production pilot identities are operational
 * state, not schema, and must be re-runnable without rotating every account.
 *
 * Inputs (environment, never arguments — arguments leak through `ps`):
 *   SUPABASE_PILOT_URL                 https://<ref>.supabase.co
 *   SUPABASE_PILOT_SERVICE_ROLE_KEY    service_role key (server-side only)
 *   SUPABASE_PILOT_PROJECT_REF         optional; derived from the URL
 *   PILOT_SECRETS_FILE                 optional; default `.env.pilot`
 *   PILOT_ADMIN_EMAIL                  required owner account email
 *
 * Output:
 *   `.env.pilot` (mode 0600, gitignored) with the Playwright fixtures.
 *   Passwords are generated once and reused on later runs, so re-seeding does
 *   not silently invalidate a browser session or a saved credential file.
 *
 * Boundaries:
 *   - The owner is tenant-scoped. There is no cross-tenant superuser: the
 *     database role enum is owner | employee | client and RLS proves isolation.
 *   - Every pilot row carries a deterministic UUID, so a second run converges
 *     instead of duplicating. The only destructive step is clearing this
 *     script's own fitting fixture (bookings for the fixture request), which is
 *     required because a confirmed booking cannot be reset to pending.
 * ============================================================================
 */
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_BASE = (process.env.SUPABASE_PILOT_URL ?? '').replace(/\/+$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_PILOT_SERVICE_ROLE_KEY ?? '';
const PROJECT_REF = process.env.SUPABASE_PILOT_PROJECT_REF ?? URL_BASE.replace(/^https?:\/\//, '').split('.')[0];
const SECRETS_FILE = process.env.PILOT_SECRETS_FILE ?? '.env.pilot';
const ADMIN_EMAIL = (process.env.PILOT_ADMIN_EMAIL ?? '').trim().toLowerCase();
const DEPLOY_URL = process.env.STITCHFLOW_E2E_BASE_URL ?? 'https://stitchflow-12pv.netlify.app';
const PUBLISHABLE_KEY = process.env.SUPABASE_PILOT_PUBLISHABLE_KEY ?? '';

if (!URL_BASE || !SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_PILOT_URL and SUPABASE_PILOT_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}
if (!ADMIN_EMAIL) {
  console.error('ERROR: PILOT_ADMIN_EMAIL is required; the seed must not target an implicit owner account.');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(URL_BASE) || !/^[a-z0-9]{20}$/.test(PROJECT_REF)) {
  console.error('ERROR: refusing to seed an unrecognised target. Expected https://<20-char-ref>.supabase.co.');
  process.exit(1);
}
const linkedProjectRef = (() => {
  try {
    return readFileSync('supabase/.temp/project-ref', 'utf8').trim();
  } catch {
    return '';
  }
})();
if (!linkedProjectRef || PROJECT_REF !== linkedProjectRef) {
  console.error('ERROR: refusing to seed a project that does not match the locally linked Supabase project.');
  process.exit(1);
}

// ----------------------------------------------------------------------------
// FIXED IDENTITIES (deterministic, so re-running converges)
// ----------------------------------------------------------------------------
const ATELIER_A = 'a0000000-0000-4000-8000-00000000000a';
const ATELIER_B = 'b0000000-0000-4000-8000-00000000000b';
const RESOURCE_A = 'a6000000-0000-4000-8000-00000000000a';
const RESOURCE_B = 'b6000000-0000-4000-8000-00000000000b';
const FIXTURE_APPOINTMENT = 'a3000000-0000-4000-8000-00000000000a';
const ORDER_A1 = 'a1000000-0000-4000-8000-000000000001';
const ORDER_A2 = 'a1000000-0000-4000-8000-000000000002';
const ORDER_B1 = 'b1000000-0000-4000-8000-000000000001';
const NOTE_A1 = 'a2000000-0000-4000-8000-000000000001';
const NOTE_A2 = 'a2000000-0000-4000-8000-000000000002';
const NOTE_B1 = 'b2000000-0000-4000-8000-000000000001';
const FEEDBACK_A = 'a4000000-0000-4000-8000-000000000001';
const LOOK_A1 = 'a5000000-0000-4000-8000-000000000001';
const LOOK_A2 = 'a5000000-0000-4000-8000-000000000002';
const LOOK_B1 = 'b5000000-0000-4000-8000-000000000001';
const INVITATION_A = 'a7000000-0000-4000-8000-000000000001';
const INVITE_CODE = 'PILOT-EMP-A-9F3K';

const FIXTURE_RESOURCE_NAME = 'Bridal & Ceremonial Fitting Room';
const FIXTURE_TIME = '09:00';

const USERS = [
  {
    key: 'ownerA', secret: 'STITCHFLOW_E2E_OWNER_PASSWORD', email: ADMIN_EMAIL,
    fullName: 'Danny Muhoro', atelier: 'A', role: 'owner',
    phone: '+254712345678', title: 'Atelier Director & Founder',
    specialty: 'Creative Director & Master Silhouette Drafter',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  },
  {
    key: 'employeeA', secret: 'STITCHFLOW_E2E_EMPLOYEE_PASSWORD', email: 'amani.artisan@example.com',
    fullName: 'Amani Wanjiru', atelier: 'A', role: 'employee',
    phone: '+254722998877', title: 'Master Artisan',
    specialty: 'Senior Couturier & Pattern Master',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80',
  },
  {
    key: 'patronA', secret: 'STITCHFLOW_E2E_PATRON_PASSWORD', email: 'zainab.patron@example.com',
    fullName: 'Dr. Zainab Al-Mansoor', atelier: 'A', role: 'client',
    phone: '+254733445566', title: 'VIP Patron',
    specialty: 'Diplomatic Envoy & Cultural Collector',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  },
  {
    key: 'ownerB', secret: 'STITCHFLOW_E2E_OWNER_B_PASSWORD', email: 'adeleke.owner@example.com',
    fullName: 'Chief Babatunde Adeleke', atelier: 'B', role: 'owner',
    phone: '+2348039876543', title: 'Managing Partner',
    specialty: 'Managing Partner & Aso-Oke Master Weaver',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    key: 'employeeB', secret: 'STITCHFLOW_E2E_EMPLOYEE_B_PASSWORD', email: 'chidi.artisan@example.com',
    fullName: 'Chidi Okonkwo', atelier: 'B', role: 'employee',
    phone: '+2348021122334', title: 'Master Artisan',
    specialty: 'Gele Sculptor & Zari Embroidery Specialist',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
  },
  {
    key: 'patronB', secret: 'STITCHFLOW_E2E_PATRON_B_PASSWORD', email: 'oladipo.patron@example.com',
    fullName: 'Senator Oladipo Williams', atelier: 'B', role: 'client',
    phone: '+2348098877665', title: 'VIP Patron',
    specialty: 'State Patron & Ceremonial Dignitary',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
  {
    key: 'invitee', secret: 'STITCHFLOW_E2E_PASSWORD', email: 'tunde.invitee@example.com',
    fullName: 'Tunde Bakare', atelier: null, role: null,
    phone: '+2348055512345', title: null, specialty: null, avatar: null,
  },
];
const FIXTURE_REQUEST_NAME = USERS.find((user) => user.key === 'patronA').fullName;

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
const sqlText = (value) => (value == null ? 'null' : `'${String(value).replace(/'/g, "''")}'`);
const sqlNum = (value) => (value == null ? 'null' : String(value));
const envLine = (key, value) => `${key}="${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function readExistingSecrets() {
  if (!existsSync(SECRETS_FILE)) return {};
  const pairs = {};
  for (const line of readFileSync(SECRETS_FILE, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) pairs[match[1]] = match[2];
  }
  return pairs;
}

async function adminFetch(path, init = {}) {
  const response = await fetch(`${URL_BASE}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? (body.msg ?? body.message ?? body.error_description ?? body.error) : '';
    const error = new Error(`admin request failed: ${init.method ?? 'GET'} ${path} -> ${response.status}${detail ? ` (${detail})` : ''}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function findUserByEmail(email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page += 1) {
    const data = await adminFetch(`/admin/users?page=${page}&per_page=200`);
    const users = data?.users ?? [];
    const match = users.find((user) => (user.email ?? '').toLowerCase() === target);
    if (match) return match;
    if (users.length < 200) return null;
  }
  return null;
}

async function ensureUser(user, password, found, hasSavedPassword) {
  if (found) {
    if (!hasSavedPassword) {
      throw new Error(
        `refusing to reset the existing account ${user.email}; provide its saved pilot password or provision it manually`,
      );
    }
    await adminFetch(`/admin/users/${found.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      }),
    });
    return found.id;
  }
  const created = await adminFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    }),
  });
  if (!created?.id) throw new Error(`admin create returned no id for ${user.email}`);
  return created.id;
}

/** Next Monday–Saturday at least one day away: the seeded availability is Mon–Sat. */
function nextOpenDay() {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 1);
  while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function buildSeedSql(ids, fixtureDate) {
  const byKey = (key) => ids[key];
  return `
-- ============================================================================
-- PILOT SEED — generated by scripts/ops/seed-pilot.mjs (do not hand-edit)
-- ============================================================================

-- 0. Reset only this script's fitting fixture. A confirmed booking cannot be
--    returned to 'pending' while it is live, so the booking rows go first.
delete from public.bookings
 where atelier_id = ${sqlText(ATELIER_A)}
   and appointment_id = ${sqlText(FIXTURE_APPOINTMENT)};

-- 1. TENANTS -----------------------------------------------------------------
insert into public.ateliers (
  id, name, slug, tagline, city, country, default_currency,
  phone, whatsapp_number, default_unit, created_by
) values
(
  ${sqlText(ATELIER_A)},
  'StitchFlow Pilot Atelier Nairobi',
  'stitchflow-pilot-nairobi',
  'Bespoke African couture, cut in Nairobi.',
  'Nairobi',
  'Kenya',
  'KES',
  '+254712345678',
  '+254712345678',
  'in',
  ${sqlText(byKey('ownerA'))}
),
(
  ${sqlText(ATELIER_B)},
  'Aso-Oke Heritage Pilot Lagos',
  'asooke-pilot-lagos',
  'Hand-loomed Aso-Oke regalia from Lagos.',
  'Lagos',
  'Nigeria',
  'NGN',
  '+2348039876543',
  '+2348039876543',
  'in',
  ${sqlText(byKey('ownerB'))}
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  tagline = excluded.tagline,
  city = excluded.city,
  country = excluded.country,
  default_currency = excluded.default_currency,
  phone = excluded.phone,
  whatsapp_number = excluded.whatsapp_number,
  default_unit = excluded.default_unit,
  created_by = excluded.created_by,
  updated_at = timezone('utc'::text, now());

-- 2. MEMBERSHIPS -------------------------------------------------------------
insert into public.members (
  id, atelier_id, role, full_name, phone, email, avatar_url, specialty, title, active
) values
${USERS.filter((user) => user.atelier).map((user) => `(
  ${sqlText(byKey(user.key))},
  ${sqlText(user.atelier === 'A' ? ATELIER_A : ATELIER_B)},
  ${sqlText(user.role)},
  ${sqlText(user.fullName)},
  ${sqlText(user.phone)},
  ${sqlText(user.email)},
  ${sqlText(user.avatar)},
  ${sqlText(user.specialty)},
  ${sqlText(user.title)},
  true
)`).join(',\n')}
on conflict (id) do update set
  atelier_id = excluded.atelier_id,
  role = excluded.role,
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  specialty = excluded.specialty,
  title = excluded.title,
  active = excluded.active,
  updated_at = timezone('utc'::text, now());

-- The invitee must start with no membership: the invitation is the only door.
delete from public.members where id = ${sqlText(byKey('invitee'))};

-- 3. MEASUREMENTS (African couture dimensions preserved) ----------------------
insert into public.measurements (
  id, atelier_id, client_id, unit,
  chest, waist, hips, length, sleeve, shoulder, inseam, neck,
  agbada_wingspan, sokoto_inseam, fila_cap_head, buba_chest,
  posture_notes, verified_at
) values
(
  'a0000000-0000-4000-8000-000000000101',
  ${sqlText(ATELIER_A)},
  ${sqlText(byKey('patronA'))},
  'in',
  38.5, 31.0, 42.5, 59.0, 24.5, 16.0, 31.5, 14.5,
  64.0, 32.0, 22.0, 40.0,
  'Slight right shoulder drop (0.5cm). Prefers structured corsetry with interior bone support.',
  timezone('utc'::text, now())
),
(
  'b0000000-0000-4000-8000-000000000101',
  ${sqlText(ATELIER_B)},
  ${sqlText(byKey('patronB'))},
  'in',
  46.0, 42.0, 45.0, 56.0, 26.0, 20.5, 33.0, 18.0,
  72.5, 34.0, 23.5, 48.0,
  'Grand stature. Extra Agbada wingspan required to achieve ceremonial folds without tension.',
  timezone('utc'::text, now())
)
on conflict (id) do update set
  posture_notes = excluded.posture_notes,
  verified_at = excluded.verified_at,
  updated_at = timezone('utc'::text, now());

-- 4. ORDERS, FINANCIALS, PROGRESS -------------------------------------------
insert into public.orders (
  id, atelier_id, order_code, client_id, assigned_tailor_id, status,
  description, garment_type, fabric_details, estimated_delivery, photo_url
) values
(
  ${sqlText(ORDER_A1)},
  ${sqlText(ATELIER_A)},
  'PILOT-A-001',
  ${sqlText(byKey('patronA'))},
  ${sqlText(byKey('employeeA'))},
  'stitching',
  'Ruracio ceremonial Kitenge corseted gown with train and metallic threadwork.',
  'Bridal Kitenge Haute Couture',
  'Original Vlisco Holland Wax (Emerald & Gold Leaf) with silk organza backing',
  current_date + interval '9 days',
  'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80'
),
(
  ${sqlText(ORDER_A2)},
  ${sqlText(ATELIER_A)},
  'PILOT-A-002',
  ${sqlText(byKey('patronA'))},
  ${sqlText(byKey('employeeA'))},
  'fitting',
  'Swahili Silk Kanzu with hand-embroidered placket and matching ceremonial Bisht.',
  'Swahili Coastal Kanzu',
  'Pure Egyptian Cotton Damask with Gold Bullion Thread',
  current_date + interval '4 days',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'
),
(
  ${sqlText(ORDER_B1)},
  ${sqlText(ATELIER_B)},
  'PILOT-B-001',
  ${sqlText(byKey('patronB'))},
  ${sqlText(byKey('employeeB'))},
  'cutting',
  '4-piece royal Alaari Aso-Oke Grand Agbada with embroidered breast pocket and tailored Sokoto.',
  'Royal Yoruba Grand Agbada',
  'Handwoven Metallic Alaari Aso-Oke with Heavy Cord Embroidery',
  current_date + interval '14 days',
  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80'
)
on conflict (id) do update set
  order_code = excluded.order_code,
  client_id = excluded.client_id,
  assigned_tailor_id = excluded.assigned_tailor_id,
  status = excluded.status,
  description = excluded.description,
  garment_type = excluded.garment_type,
  fabric_details = excluded.fabric_details,
  estimated_delivery = excluded.estimated_delivery,
  updated_at = timezone('utc'::text, now());

insert into public.order_financials (order_id, atelier_id, deposit_amount, balance_due, currency)
values
  (${sqlText(ORDER_A1)}, ${sqlText(ATELIER_A)}, 45000.00, 25000.00, 'KES'),
  (${sqlText(ORDER_A2)}, ${sqlText(ATELIER_A)}, 32000.00, 18000.00, 'KES'),
  (${sqlText(ORDER_B1)}, ${sqlText(ATELIER_B)}, 350000.00, 150000.00, 'NGN')
on conflict (order_id) do update set
  deposit_amount = excluded.deposit_amount,
  balance_due = excluded.balance_due,
  currency = excluded.currency,
  updated_at = timezone('utc'::text, now());

insert into public.order_progress_notes (id, order_id, stage, note, author_id)
values
(
  ${sqlText(NOTE_A1)}, ${sqlText(ORDER_A1)}, 'cutting',
  'Vlisco Hollandais wax aligned on the straight grain; corset panels chalked.',
  ${sqlText(byKey('employeeA'))}
),
(
  ${sqlText(NOTE_A2)}, ${sqlText(ORDER_A1)}, 'stitching',
  'Chain-stitch embroidery applied to the chest placket. Organza underlay set.',
  ${sqlText(byKey('employeeA'))}
),
(
  ${sqlText(NOTE_B1)}, ${sqlText(ORDER_B1)}, 'cutting',
  'Alaari strips matched on the breast pocket; Sokoto drawstring channel cut.',
  ${sqlText(byKey('employeeB'))}
)
on conflict (id) do nothing;

-- 5. FEEDBACK + LOOKBOOK -----------------------------------------------------
insert into public.feedback (id, atelier_id, order_id, client_id, rating, fit_rating, comments, resolution_status)
values
(
  ${sqlText(FEEDBACK_A)}, ${sqlText(ATELIER_A)}, ${sqlText(ORDER_A2)}, ${sqlText(byKey('patronA'))},
  5, 'perfect',
  'The Kanzu placket embroidery is exquisite and the Bisht drape sits beautifully.',
  'resolved'
)
on conflict (id) do nothing;

insert into public.lookbook_items (
  id, atelier_id, title, category, description, fabric, price_range,
  turnaround_days, image_url, cultural_origin, tags, is_featured, is_published
) values
(
  ${sqlText(LOOK_A1)}, ${sqlText(ATELIER_A)},
  'Imperial 3-Piece Grand Agbada',
  'Grand Agbada & Boubou',
  'Monumental royal silhouette in hand-dyed damask with signature chest embroidery and structured shoulder drape.',
  'Heavy Guinean Brocade & Gold Thread',
  'KES 48,000 - 75,000',
  14,
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
  'Yoruba / West African Royal Court',
  array['Agbada', 'Bespoke', 'Gala', 'Heritage'],
  true, true
),
(
  ${sqlText(LOOK_A2)}, ${sqlText(ATELIER_A)},
  'Bespoke Nairobi Senator Suit',
  'Senator Suits & Kaftans',
  'Slim-tailored monochromatic kaftan with asymmetrical front buttoning, matching trousers, and pocket embellishment.',
  'Super 150s Tropical Wool Blend',
  'KES 24,000 - 38,000',
  7,
  'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
  'Modern Niger Delta / Pan-African Executive',
  array['Senator', 'Executive', 'Modern', 'Minimalist'],
  true, true
),
(
  ${sqlText(LOOK_B1)}, ${sqlText(ATELIER_B)},
  'Royal Alaari Aso-Oke Ceremonial Regalia',
  'Grand Agbada & Boubou',
  'Hand-loomed magenta and gold strip-woven Aso-Oke with artisanal openwork perforations and matching Gobi cap.',
  'Ancestral Hand-Loomed Alaari Cotton & Silk',
  'NGN 450,000 - 800,000',
  21,
  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
  'Yoruba Ancestral High Royalty',
  array['Aso-Oke', 'Alaari', 'Royal', 'Coronation'],
  true, true
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  is_published = excluded.is_published,
  updated_at = timezone('utc'::text, now());

-- 6. BOOKING RESOURCES + MONDAY–SATURDAY AVAILABILITY ------------------------
insert into public.booking_resources (id, atelier_id, kind, display_name, capacity, timezone, active)
values
(
  ${sqlText(RESOURCE_A)}, ${sqlText(ATELIER_A)}, 'fitting_room',
  ${sqlText(FIXTURE_RESOURCE_NAME)}, 1, 'Africa/Nairobi', true
),
(
  ${sqlText(RESOURCE_B)}, ${sqlText(ATELIER_B)}, 'fitting_room',
  'Royal Agbada Fitting Room', 1, 'Africa/Lagos', true
)
on conflict (id) do update set
  display_name = excluded.display_name,
  timezone = excluded.timezone,
  active = excluded.active,
  updated_at = timezone('utc'::text, now());

delete from public.resource_availability_rules
 where resource_id in (${sqlText(RESOURCE_A)}, ${sqlText(RESOURCE_B)});

insert into public.resource_availability_rules (atelier_id, resource_id, weekday, starts_at, ends_at)
select resource.atelier_id, resource.id, weekday.value, '09:00'::time, '18:00'::time
from public.booking_resources resource
cross join generate_series(1, 6) as weekday(value)
where resource.id in (${sqlText(RESOURCE_A)}, ${sqlText(RESOURCE_B)});

-- 7. FITTING FIXTURE --------------------------------------------------------
insert into public.appointments (
  id, atelier_id, client_id, client_name, client_phone, client_email,
  service_type, slot_datetime, status, assigned_tailor_id,
  cultural_occasion, notes, source
) values
(
  ${sqlText(FIXTURE_APPOINTMENT)},
  ${sqlText(ATELIER_A)},
  ${sqlText(byKey('patronA'))},
  ${sqlText(FIXTURE_REQUEST_NAME)},
  '+254711223344',
  ${sqlText(USERS.find((user) => user.key === 'patronA').email)},
  'basted_fitting',
  (${sqlText(fixtureDate + 'T09:00:00')}::timestamp at time zone 'Africa/Nairobi'),
  'pending',
  ${sqlText(byKey('employeeA'))},
  'Ruracio bridal basted fitting',
  'Account-linked pilot request for a Saturday morning fitting.',
  'pilot'
)
on conflict (id) do update set
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  client_phone = excluded.client_phone,
  client_email = excluded.client_email,
  service_type = excluded.service_type,
  slot_datetime = excluded.slot_datetime,
  status = excluded.status,
  assigned_tailor_id = excluded.assigned_tailor_id,
  cultural_occasion = excluded.cultural_occasion,
  notes = excluded.notes,
  source = excluded.source,
  updated_at = timezone('utc'::text, now());

-- 8. PENDING INVITATION ------------------------------------------------------
insert into public.invitations (
  id, atelier_id, email, role, invitation_code, invited_by, expires_at, accepted_at
) values
(
  ${sqlText(INVITATION_A)},
  ${sqlText(ATELIER_A)},
  ${sqlText(USERS.find((user) => user.key === 'invitee').email)},
  'employee',
  ${sqlText(INVITE_CODE)},
  ${sqlText(byKey('ownerA'))},
  timezone('utc'::text, now()) + interval '14 days',
  null
)
on conflict (invitation_code) do update set
  atelier_id = excluded.atelier_id,
  email = excluded.email,
  role = excluded.role,
  invited_by = excluded.invited_by,
  expires_at = excluded.expires_at,
  accepted_at = null;

-- 9. SELF-CHECK (fails the transaction rather than leaving a half-seeded pilot)
do $$
declare
  v_members integer;
  v_ateliers integer;
  v_pending integer;
  v_patron_appointments integer;
  v_resources integer;
begin
  select count(*) into v_members from public.members
   where atelier_id in (${sqlText(ATELIER_A)}, ${sqlText(ATELIER_B)}) and active;
  if v_members <> 6 then
    raise exception 'pilot seed expected 6 memberships, found %', v_members;
  end if;

  select count(*) into v_ateliers from public.ateliers where id in (${sqlText(ATELIER_A)}, ${sqlText(ATELIER_B)});
  if v_ateliers <> 2 then
    raise exception 'pilot seed expected 2 ateliers, found %', v_ateliers;
  end if;

  select count(*) into v_pending from public.appointments
   where atelier_id = ${sqlText(ATELIER_A)} and status = 'pending';
  if v_pending < 1 then
    raise exception 'pilot seed expected a pending fitting request, found %', v_pending;
  end if;

  select count(*) into v_patron_appointments from public.appointments
   where id = ${sqlText(FIXTURE_APPOINTMENT)}
     and client_id = ${sqlText(byKey('patronA'))}
     and status = 'pending';
  if v_patron_appointments <> 1 then
    raise exception 'pilot seed expected one pending patron-linked fitting, found %', v_patron_appointments;
  end if;

  select count(*) into v_resources from public.booking_resources
   where atelier_id = ${sqlText(ATELIER_A)} and active;
  if v_resources < 1 then
    raise exception 'pilot seed expected an active booking resource, found %', v_resources;
  end if;
end $$;
`.trimStart();
}

function applySql(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'stitchflow-pilot-'));
  const file = join(dir, 'seed.sql');
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    const result = spawnSync(
      'npx',
      ['supabase', 'db', 'query', `--remote=${PROJECT_REF}`, '--yes', '--file', file],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim();
      throw new Error(`seed SQL failed (exit ${result.status}): ${detail.slice(0, 2000)}`);
    }
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ----------------------------------------------------------------------------
// RUN
// ----------------------------------------------------------------------------
const existing = readExistingSecrets();
const passwords = {};
const existingUsers = new Map();

console.log(`==> target project: ${PROJECT_REF}`);
console.log('==> checking pilot identity prerequisites');

for (const user of USERS) {
  const found = await findUserByEmail(user.email);
  if (found && !existing[user.secret]) {
    throw new Error(
      `refusing to reset the existing account ${user.email}; provide its saved pilot password or provision it manually`,
    );
  }
  existingUsers.set(user.key, found);
}

console.log('==> creating or refreshing pilot identities (passwords never printed)');

const ids = {};
for (const user of USERS) {
  const password = existing[user.secret] || randomBytes(24).toString('base64url');
  passwords[user.key] = password;
  ids[user.key] = await ensureUser(
    user,
    password,
    existingUsers.get(user.key),
    Boolean(existing[user.secret]),
  );
  console.log(`    ${user.role ?? 'invitee'}\t${user.email}\t${ids[user.key]}`);
}

const fixtureDate = nextOpenDay();
console.log(`==> applying tenant seed (fitting fixture ${fixtureDate} ${FIXTURE_TIME} Africa/Nairobi)`);
applySql(buildSeedSql(ids, fixtureDate));
console.log('    seed committed; in-transaction self-check passed');

const env = [
  '# Generated by scripts/ops/seed-pilot.mjs. Do not commit. chmod 600.',
  `# Project: ${PROJECT_REF}  Seeded: ${new Date().toISOString()}`,
  envLine('STITCHFLOW_E2E_BASE_URL', DEPLOY_URL),
  ...(PUBLISHABLE_KEY ? [
    '# Public project coordinates (the browser bundle carries both)',
    envLine('SUPABASE_PILOT_URL', URL_BASE),
    envLine('SUPABASE_PILOT_PUBLISHABLE_KEY', PUBLISHABLE_KEY),
  ] : []),
  '',
  '# Pilot atelier A (Nairobi) — owner is the tenant-scoped admin',
  envLine('STITCHFLOW_E2E_OWNER_EMAIL', ADMIN_EMAIL),
  envLine('STITCHFLOW_E2E_OWNER_PASSWORD', passwords.ownerA),
  envLine('STITCHFLOW_E2E_EMPLOYEE_EMAIL', USERS.find((u) => u.key === 'employeeA').email),
  envLine('STITCHFLOW_E2E_EMPLOYEE_PASSWORD', passwords.employeeA),
  envLine('STITCHFLOW_E2E_PATRON_EMAIL', USERS.find((u) => u.key === 'patronA').email),
  envLine('STITCHFLOW_E2E_PATRON_PASSWORD', passwords.patronA),
  '',
  '# Isolation-only tenant B (Lagos) — not part of the supervised pilot',
  envLine('STITCHFLOW_E2E_OWNER_B_EMAIL', USERS.find((u) => u.key === 'ownerB').email),
  envLine('STITCHFLOW_E2E_OWNER_B_PASSWORD', passwords.ownerB),
  envLine('STITCHFLOW_E2E_EMPLOYEE_B_EMAIL', USERS.find((u) => u.key === 'employeeB').email),
  envLine('STITCHFLOW_E2E_EMPLOYEE_B_PASSWORD', passwords.employeeB),
  envLine('STITCHFLOW_E2E_PATRON_B_EMAIL', USERS.find((u) => u.key === 'patronB').email),
  envLine('STITCHFLOW_E2E_PATRON_B_PASSWORD', passwords.patronB),
  '',
  '# Invitation redemption (invitee has no membership until the code is redeemed)',
  envLine('STITCHFLOW_E2E_EMAIL', USERS.find((u) => u.key === 'invitee').email),
  envLine('STITCHFLOW_E2E_PASSWORD', passwords.invitee),
  envLine('STITCHFLOW_E2E_EXPECTED_ROLE', 'employee'),
  envLine('STITCHFLOW_E2E_INVITE_CODE', INVITE_CODE),
  '',
  '# Protected fitting confirmation fixture',
  envLine('STITCHFLOW_E2E_BOOKING_REQUEST_NAME', FIXTURE_REQUEST_NAME),
  envLine('STITCHFLOW_E2E_BOOKING_RESOURCE_NAME', FIXTURE_RESOURCE_NAME),
  envLine('STITCHFLOW_E2E_BOOKING_DATE', fixtureDate),
  envLine('STITCHFLOW_E2E_BOOKING_TIME', FIXTURE_TIME),
  '',
  '# IDs (not secret)',
  envLine('PILOT_ATELIER_A', ATELIER_A),
  envLine('PILOT_ATELIER_B', ATELIER_B),
  envLine('PILOT_INVITE_CODE', INVITE_CODE),
  '',
].join('\n');

writeFileSync(SECRETS_FILE, env, { mode: 0o600 });
chmodSync(SECRETS_FILE, 0o600);

console.log(`==> wrote ${SECRETS_FILE} (mode 600, gitignored)`);
console.log('==> done. Next: node scripts/ops/verify-pilot.mjs');
