#!/usr/bin/env node
/**
 * ============================================================================
 * PILOT PROOF — role visibility and tenant isolation against the HOSTED project
 * ----------------------------------------------------------------------------
 * Signs in as each seeded identity with the ANON/publishable key only (exactly
 * what the browser has) and asserts what RLS actually returns. No service-role
 * access is used here on purpose: a service-role assertion proves nothing about
 * the browser boundary.
 *
 * Proves:
 *   - each role resolves to the expected membership role in its own atelier;
 *   - owner/employee/patron reads are scoped to their own tenant;
 *   - a second-tenant owner cannot read or write the first tenant's rows;
 *   - an invited user with no membership sees nothing until redemption;
 *   - financials are hidden from employees;
 *   - anonymous callers are refused by the booking RPC (fail closed).
 *
 * Reads .env.pilot (mode 600, gitignored) and exits non-zero on any failure.
 * ============================================================================
 */
import { existsSync, readFileSync } from 'node:fs';

const SECRETS_FILE = process.env.PILOT_SECRETS_FILE ?? '.env.pilot';

if (!existsSync(SECRETS_FILE)) {
  console.error(`ERROR: ${SECRETS_FILE} not found. Run scripts/ops/seed-pilot.mjs first.`);
  process.exit(1);
}

const fileEnv = {};
for (const line of readFileSync(SECRETS_FILE, 'utf8').split('\n')) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (!match) continue;
  const raw = match[2];
  fileEnv[match[1]] = raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')
    ? raw.slice(1, -1).replace(/\\(["\\])/g, '$1')
    : raw;
}

const env = (key) => process.env[key] ?? fileEnv[key];
const URL_BASE = (env('SUPABASE_PILOT_URL') ?? '').replace(/\/+$/, '');
const PUBLISHABLE_KEY = env('SUPABASE_PILOT_PUBLISHABLE_KEY') ?? '';
const ATELIER_A = env('PILOT_ATELIER_A');
const ATELIER_B = env('PILOT_ATELIER_B');

if (!URL_BASE || !PUBLISHABLE_KEY || !ATELIER_A || !ATELIER_B) {
  console.error('ERROR: SUPABASE_PILOT_URL, SUPABASE_PILOT_PUBLISHABLE_KEY, PILOT_ATELIER_A and PILOT_ATELIER_B are required.');
  process.exit(1);
}

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const label = passed ? 'PASS' : 'FAIL';
  console.log(`${label}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function signIn(email, password) {
  const response = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`sign-in failed for ${email}: HTTP ${response.status}`);
  }
  const body = await response.json();
  const payload = JSON.parse(Buffer.from(body.access_token.split('.')[1], 'base64url').toString('utf8'));
  return { token: body.access_token, userId: payload.sub, email };
}

async function select(session, table, query) {
  const response = await fetch(`${URL_BASE}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.token ?? PUBLISHABLE_KEY}`,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : [];
  if (!response.ok) {
    throw new Error(`GET ${table}?${query} -> ${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  return Array.isArray(body) ? body : [];
}

async function attemptWrite(session, method, table, body) {
  const response = await fetch(`${URL_BASE}/rest/v1/${table}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.token ?? PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: response.status, ok: response.ok, body: parsed };
}

async function callRpc(session, fn, args) {
  const response = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.token ?? PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: response.status, ok: response.ok, body: parsed };
}

const count = async (session, table, query) => (await select(session, table, query)).length;

// ----------------------------------------------------------------------------
// SIGN IN
// ----------------------------------------------------------------------------
const people = {
  ownerA: await signIn(env('STITCHFLOW_E2E_OWNER_EMAIL'), env('STITCHFLOW_E2E_OWNER_PASSWORD')),
  employeeA: await signIn(env('STITCHFLOW_E2E_EMPLOYEE_EMAIL'), env('STITCHFLOW_E2E_EMPLOYEE_PASSWORD')),
  patronA: await signIn(env('STITCHFLOW_E2E_PATRON_EMAIL'), env('STITCHFLOW_E2E_PATRON_PASSWORD')),
  ownerB: await signIn(env('STITCHFLOW_E2E_OWNER_B_EMAIL'), env('STITCHFLOW_E2E_OWNER_B_PASSWORD')),
  patronB: await signIn(env('STITCHFLOW_E2E_PATRON_B_EMAIL'), env('STITCHFLOW_E2E_PATRON_B_PASSWORD')),
  invitee: await signIn(env('STITCHFLOW_E2E_EMAIL'), env('STITCHFLOW_E2E_PASSWORD')),
};
console.log(`==> signed in ${Object.keys(people).length} pilot identities against ${URL_BASE}`);

// ----------------------------------------------------------------------------
// 1. ROLE RESOLUTION
// ----------------------------------------------------------------------------
for (const [key, expectedRole, expectedAtelier] of [
  ['ownerA', 'owner', ATELIER_A],
  ['employeeA', 'employee', ATELIER_A],
  ['patronA', 'client', ATELIER_A],
  ['ownerB', 'owner', ATELIER_B],
  ['patronB', 'client', ATELIER_B],
]) {
  const rows = await select(people[key], 'members', `select=role,atelier_id&id=eq.${people[key].userId}`);
  const row = rows[0];
  record(
    `${key} resolves to ${expectedRole} in its own atelier`,
    row?.role === expectedRole && row?.atelier_id === expectedAtelier,
    row ? `${row.role} @ ${row.atelier_id.slice(0, 8)}` : 'no membership row',
  );
}

record(
  'invitee has no membership before redeeming the code',
  (await count(people.invitee, 'members', `select=id&id=eq.${people.invitee.userId}`)) === 0,
);

// ----------------------------------------------------------------------------
// 2. TENANT-SCOPED READS
// ----------------------------------------------------------------------------
record('owner A reads all 3 members of atelier A', (await count(people.ownerA, 'members', `select=id&atelier_id=eq.${ATELIER_A}`)) === 3);
record('owner A reads the 2 orders of atelier A', (await count(people.ownerA, 'orders', `select=id&atelier_id=eq.${ATELIER_A}`)) === 2);
record('employee A reads the 2 orders assigned in atelier A', (await count(people.employeeA, 'orders', `select=id&atelier_id=eq.${ATELIER_A}`)) === 2);
record('patron A reads only its own 2 orders', (await count(people.patronA, 'orders', `select=id&atelier_id=eq.${ATELIER_A}`)) === 2, undefined);
record('patron A reads its own measurements', (await count(people.patronA, 'measurements', `select=id&atelier_id=eq.${ATELIER_A}`)) === 1);
const PILOT_FITTING_ID = 'a3000000-0000-4000-8000-00000000000a';
const pilotFitting = await select(
  people.ownerA,
  'appointments',
  `select=id,status,source&id=eq.${PILOT_FITTING_ID}&atelier_id=eq.${ATELIER_A}`,
);
record(
  'owner A reads the pilot fitting before or after protected confirmation',
  pilotFitting.length === 1
    && pilotFitting[0].source === 'pilot'
    && ['pending', 'confirmed'].includes(pilotFitting[0].status),
);

// ----------------------------------------------------------------------------
// 3. CROSS-TENANT DENIAL (reads)
// ----------------------------------------------------------------------------
record('owner B cannot read atelier A members', (await count(people.ownerB, 'members', `select=id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('owner B cannot read atelier A orders', (await count(people.ownerB, 'orders', `select=id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('owner B cannot read atelier A measurements', (await count(people.ownerB, 'measurements', `select=id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('owner B cannot read atelier A appointments', (await count(people.ownerB, 'appointments', `select=id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('owner B cannot read atelier A financials', (await count(people.ownerB, 'order_financials', `select=order_id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('patron B cannot read atelier A orders', (await count(people.patronB, 'orders', `select=id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('owner A cannot read atelier B orders', (await count(people.ownerA, 'orders', `select=id&atelier_id=eq.${ATELIER_B}`)) === 0);
record('invitee cannot read any atelier before redeeming', (await count(people.invitee, 'ateliers', 'select=id')) === 0);

// ----------------------------------------------------------------------------
// 4. ROLE LIMITS INSIDE THE TENANT
// ----------------------------------------------------------------------------
record('employee cannot read owner-only financials', (await count(people.employeeA, 'order_financials', `select=order_id&atelier_id=eq.${ATELIER_A}`)) === 0);
record('owner reads the financials of both atelier A orders', (await count(people.ownerA, 'order_financials', `select=order_id&atelier_id=eq.${ATELIER_A}`)) === 2);
record(
  'patron A reads its own fitting and not another patron fitting',
  (await count(people.patronA, 'appointments', `select=id&atelier_id=eq.${ATELIER_A}&client_id=eq.${people.patronA.userId}`)) === 1
    && (await count(people.patronA, 'appointments', `select=id&atelier_id=eq.${ATELIER_A}&client_id=eq.${people.patronB.userId}`)) === 0,
);

// ----------------------------------------------------------------------------
// 5. WRITE DENIAL AT THE REAL BOUNDARY
// ----------------------------------------------------------------------------
const crossTenantInsert = await attemptWrite(people.ownerB, 'POST', 'orders', {
  atelier_id: ATELIER_A,
  order_code: 'CROSS-TENANT-PROBE',
  client_id: people.patronA.userId,
  status: 'cutting',
  description: 'cross-tenant probe that must never persist',
  garment_type: 'probe',
  fabric_details: 'probe',
});
record('owner B cannot insert an order into atelier A', !crossTenantInsert.ok || (Array.isArray(crossTenantInsert.body) && crossTenantInsert.body.length === 0), `HTTP ${crossTenantInsert.status}`);

const patronInsert = await attemptWrite(people.patronA, 'POST', 'orders', {
  atelier_id: ATELIER_A,
  order_code: 'PATRON-SELF-INSERT',
  client_id: people.patronA.userId,
  status: 'cutting',
  description: 'patron probe that must never persist',
  garment_type: 'probe',
  fabric_details: 'probe',
});
record('patron cannot create an order', !patronInsert.ok || (Array.isArray(patronInsert.body) && patronInsert.body.length === 0), `HTTP ${patronInsert.status}`);

const crossTenantUpdate = await attemptWrite(people.ownerB, 'PATCH', `ateliers?id=eq.${ATELIER_A}`, { name: 'hijacked' });
record('owner B cannot update atelier A', !crossTenantUpdate.ok || (Array.isArray(crossTenantUpdate.body) && crossTenantUpdate.body.length === 0), `HTTP ${crossTenantUpdate.status}`);

const anonInsert = await attemptWrite(null, 'POST', 'appointments', {
  atelier_id: ATELIER_A,
  client_name: 'anonymous probe',
  client_phone: '+10000000000',
  service_type: 'basted_fitting',
  slot_datetime: new Date(Date.now() + 86400000).toISOString(),
  status: 'pending',
});
record('anonymous caller cannot write a fitting request', !anonInsert.ok, `HTTP ${anonInsert.status}`);

// ----------------------------------------------------------------------------
// 6. BOOKING RPC FAILS CLOSED
// ----------------------------------------------------------------------------
const anonAvailability = await callRpc(null, 'get_availability', {
  p_atelier_id: ATELIER_A,
  p_resource_id: 'a6000000-0000-4000-8000-00000000000a',
  p_from: new Date().toISOString(),
  p_to: new Date(Date.now() + 86400000).toISOString(),
  p_slot_minutes: 45,
});
record('anonymous caller is refused by get_availability', !anonAvailability.ok, `HTTP ${anonAvailability.status}`);

const crossAvailability = await callRpc(people.employeeA, 'get_availability', {
  p_atelier_id: ATELIER_B,
  p_resource_id: 'b6000000-0000-4000-8000-00000000000b',
  p_from: new Date().toISOString(),
  p_to: new Date(Date.now() + 86400000).toISOString(),
  p_slot_minutes: 45,
});
record(
  'cross-tenant get_availability returns forbidden, not slots',
  crossAvailability.body?.error === 'forbidden',
  JSON.stringify(crossAvailability.body).slice(0, 80),
);

const ownAvailability = await callRpc(people.ownerA, 'get_availability', {
  p_atelier_id: ATELIER_A,
  p_resource_id: 'a6000000-0000-4000-8000-00000000000a',
  p_from: new Date(Date.now() + 86400000).toISOString(),
  p_to: new Date(Date.now() + 2 * 86400000).toISOString(),
  p_slot_minutes: 45,
});
record(
  'owner A gets real availability slots in its own atelier',
  !ownAvailability.body?.error && Array.isArray(ownAvailability.body?.slots) && ownAvailability.body.slots.length > 0,
  `${ownAvailability.body?.slots?.length ?? 0} slots`,
);

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
const failures = results.filter((result) => !result.passed);
console.log('');
console.log(`==> ${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAILED: ${failure.name}`);
  process.exit(1);
}
console.log('==> pilot proof complete');
