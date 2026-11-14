#!/usr/bin/env node
/**
 * Prepare the disposable local stack so the browser suite has real identities
 * and a real pending request.
 *
 * `supabase db reset` already applies `supabase/seed.sql`, which creates the
 * tenants, members, orders, resources, availability and the pending staff-inbox
 * request. Two things are deliberately *not* in the seed:
 *
 *   1. Auth passwords. The seed creates `auth.users` rows without credentials so
 *      no password is ever committed. They are set here through the GoTrue admin
 *      API on the loopback stack only.
 *   2. The patron link on the pending request. The seed leaves `client_id` null
 *      (it is a public request). The patron journey asserts the patron can see
 *      their own fitting request, so it is linked here — through PostgREST as the
 *      owner, which is the same boundary the product uses.
 *
 * Both steps are verified by a real password sign-in and a real patron read, so
 * a silent failure cannot leave the suite running against half-seeded data.
 *
 * The service-role key arrives through the environment and is never written to
 * disk or printed. Random per-run fixture passwords are captured by the
 * hermetic runner in memory and passed directly to Playwright.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const envFile = process.env.STITCHFLOW_E2E_ENV_FILE ?? '.env.test';
if (!existsSync(envFile)) {
  console.error(`ERROR: ${envFile} not found.`);
  process.exit(1);
}

const fileEnv = {};
for (const rawLine of readFileSync(envFile, 'utf8').split('\n')) {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(rawLine.trim());
  if (!match) continue;
  let value = match[2].trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  fileEnv[match[1]] = value;
}

const env = (key) => process.env[key] ?? fileEnv[key] ?? '';

const baseUrl = env('SUPABASE_LOCAL_URL').replace(/\/+$/, '');
const serviceRoleKey = env('SUPABASE_LOCAL_SERVICE_ROLE_KEY');
const anonKey = env('SUPABASE_LOCAL_ANON_KEY');

if (!baseUrl || !serviceRoleKey || !anonKey) {
  console.error(
    'ERROR: the local stack must be running. SUPABASE_LOCAL_URL, SUPABASE_LOCAL_ANON_KEY and ' +
      'SUPABASE_LOCAL_SERVICE_ROLE_KEY are provided by scripts/e2e/hermetic.sh.',
  );
  process.exit(1);
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(baseUrl)) {
  console.error(`ERROR: refusing to seed a non-loopback stack (${baseUrl}).`);
  process.exit(1);
}

const identities = [
  {
    label: 'owner',
    id: env('STITCHFLOW_SEED_OWNER_ID'),
    email: env('STITCHFLOW_E2E_OWNER_EMAIL'),
    password: env('STITCHFLOW_E2E_OWNER_PASSWORD') || randomBytes(32).toString('base64url'),
  },
  {
    label: 'employee',
    id: env('STITCHFLOW_SEED_EMPLOYEE_ID'),
    email: env('STITCHFLOW_E2E_EMPLOYEE_EMAIL'),
    password: env('STITCHFLOW_E2E_EMPLOYEE_PASSWORD') || randomBytes(32).toString('base64url'),
  },
  {
    label: 'patron',
    id: env('STITCHFLOW_SEED_PATRON_ID'),
    email: env('STITCHFLOW_E2E_PATRON_EMAIL'),
    password: env('STITCHFLOW_E2E_PATRON_PASSWORD') || randomBytes(32).toString('base64url'),
  },
];

for (const identity of identities) {
  if (!identity.id || !identity.email || !identity.password) {
    console.error(`ERROR: ${identity.label} identity needs an id, email, and password in ${envFile}.`);
    process.exit(1);
  }
}

async function call(path, { method = 'GET', token, body, admin = false, headers = {} } = {}) {
  // An admin call must carry the service-role key in BOTH headers. Sending the
  // anon token in `Authorization` while `apikey` is the service key produces a
  // 403 `not_admin` from GoTrue, which is easy to misread as a permissions
  // problem in the database.
  const key = admin ? serviceRoleKey : anonKey;
  const bearer = token ?? key;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

/** Set a password on a seed identity. Update first; create if the row is absent. */
async function setPassword(identity) {
  const update = await call(`/auth/v1/admin/users/${identity.id}`, {
    method: 'PUT',
    admin: true,
    body: { password: identity.password, email_confirm: true },
  });
  if (update.ok) return;

  const create = await call('/auth/v1/admin/users', {
    method: 'POST',
    admin: true,
    body: {
      id: identity.id,
      email: identity.email,
      password: identity.password,
      email_confirm: true,
    },
  });
  if (!create.ok) {
    throw new Error(
      `could not set a password for the ${identity.label} identity ` +
        `(update HTTP ${update.status}, create HTTP ${create.status})`,
    );
  }
}

/** Prove the credentials actually work; a seeded password is worthless untested. */
async function signIn(identity) {
  const response = await call('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: identity.email, password: identity.password },
  });
  if (!response.ok || !response.body?.access_token) {
    throw new Error(`${identity.label} sign-in failed (HTTP ${response.status})`);
  }
  const payload = JSON.parse(Buffer.from(response.body.access_token.split('.')[1], 'base64url').toString('utf8'));
  if (payload.sub !== identity.id) {
    throw new Error(`${identity.label} signed in as ${payload.sub}, expected ${identity.id}`);
  }
  return { token: response.body.access_token, userId: payload.sub };
}

for (const identity of identities) {
  await setPassword(identity);
  identity.session = await signIn(identity);
}

const atelierId = env('STITCHFLOW_E2E_ATELIER_ID') || env('STITCHFLOW_SEED_ATELIER_A');
const requestId = env('STITCHFLOW_SEED_PENDING_REQUEST_ID');
const patron = identities.find((identity) => identity.label === 'patron');
const owner = identities.find((identity) => identity.label === 'owner');
const patronName = 'Dr. Zainab Al-Mansoor';

if (!atelierId || !requestId) {
  console.error('ERROR: STITCHFLOW_SEED_ATELIER_A and STITCHFLOW_SEED_PENDING_REQUEST_ID are required.');
  process.exit(1);
}

const fixturePath =
  `/rest/v1/appointments?select=id,status,source,client_id&id=eq.${requestId}&atelier_id=eq.${atelierId}`;
const before = await call(fixturePath, { token: owner.session.token });
if (!before.ok || before.body?.length !== 1) {
  throw new Error(`the pending request ${requestId} is not readable by the owner (HTTP ${before.status})`);
}
if (before.body[0].status !== 'pending') {
  throw new Error(`the request fixture must be pending, found "${before.body[0].status}"`);
}

const linked = await call(fixturePath, {
  method: 'PATCH',
  token: owner.session.token,
  body: {
    source: 'pilot',
    client_id: patron.session.userId,
    client_name: patronName,
    client_email: patron.email,
  },
  headers: { Prefer: 'return=representation' },
});
if (
  !linked.ok ||
  linked.body?.length !== 1 ||
  linked.body[0].client_id !== patron.session.userId
) {
  throw new Error(
    `owner-scoped fixture update did not return the patron-linked row ` +
      `(HTTP ${linked.status}, client_id ${linked.body?.[0]?.client_id ?? '(none)'}, ` +
      `expected ${patron.session.userId}).`,
  );
}

const patronView = await call(
  `/rest/v1/appointments?select=id,client_id,status&id=eq.${requestId}&atelier_id=eq.${atelierId}`,
  { token: patron.session.token },
);
if (!patronView.ok || patronView.body?.length !== 1 || patronView.body[0].client_id !== patron.session.userId) {
  throw new Error(`patron RLS did not expose the linked request (HTTP ${patronView.status})`);
}

console.error('PASS: three local identities can sign in, and the pending fitting request is linked and patron-visible.');

// ---------------------------------------------------------------------------
// Invitation-acceptance fixture.
//
// The invitee deliberately does not live in `supabase/seed.sql`: the
// `accept_invitation` RPC refuses to move an existing member between ateliers,
// so every seed identity is unusable as an invitee. The identity and the
// invitation row are created here, through the same admin API and owner-scoped
// table the product uses.
// ---------------------------------------------------------------------------
const inviteeId = env('STITCHFLOW_SEED_INVITEE_ID');
const inviteeEmail = env('STITCHFLOW_E2E_EMAIL');
const inviteePassword = env('STITCHFLOW_E2E_PASSWORD') || randomBytes(32).toString('base64url');
const inviteCode = env('STITCHFLOW_E2E_INVITE_CODE');
const inviteRole = env('STITCHFLOW_E2E_EXPECTED_ROLE') || 'employee';

if (!inviteeId || !inviteeEmail || !inviteePassword || !inviteCode) {
  console.error(
    'ERROR: the invitation fixture needs STITCHFLOW_SEED_INVITEE_ID, STITCHFLOW_E2E_EMAIL, ' +
      'STITCHFLOW_E2E_PASSWORD and STITCHFLOW_E2E_INVITE_CODE in ' + envFile + '.',
  );
  process.exit(1);
}

const invitee = {
  label: 'invitee',
  id: inviteeId,
  email: inviteeEmail,
  password: inviteePassword,
};
await setPassword(invitee);
await signIn(invitee);

const invitePath =
  '/rest/v1/invitations?select=id,email,role,invitation_code,accepted_at&invitation_code=eq.' +
  encodeURIComponent(inviteCode);
const existingInvite = await call(invitePath, { token: owner.session.token });

if (existingInvite.ok && existingInvite.body?.length === 1) {
  const reset = await call(
    `/rest/v1/invitations?id=eq.${existingInvite.body[0].id}`,
    {
      method: 'PATCH',
      token: owner.session.token,
      body: { email: inviteeEmail, role: inviteRole, accepted_at: null },
      headers: { Prefer: 'return=representation' },
    },
  );
  if (!reset.ok || reset.body?.length !== 1) {
    throw new Error(`could not reset the invitation fixture (HTTP ${reset.status})`);
  }
} else {
  const created = await call('/rest/v1/invitations', {
    method: 'POST',
    token: owner.session.token,
    body: {
      atelier_id: atelierId,
      email: inviteeEmail,
      role: inviteRole,
      invitation_code: inviteCode,
      invited_by: owner.session.userId,
    },
    headers: { Prefer: 'return=representation' },
  });
  if (!created.ok || created.body?.length !== 1) {
    throw new Error(`could not create the invitation fixture (HTTP ${created.status})`);
  }
}

// Prove the fixture is redeemable: unaccepted, of the expected role, addressed
// to the invitee. A silent mismatch would fail the browser journey for a reason
// that looks like an application defect.
const verifiedInvite = await call(invitePath, { token: owner.session.token });
if (
  !verifiedInvite.ok ||
  verifiedInvite.body?.length !== 1 ||
  verifiedInvite.body[0].accepted_at !== null ||
  verifiedInvite.body[0].email !== inviteeEmail ||
  verifiedInvite.body[0].role !== inviteRole
) {
  throw new Error('the invitation fixture is not in the expected unaccepted state');
}

console.error(`PASS: the invitation fixture (${inviteRole}) is seeded and redeemable.`);
process.stdout.write(
  JSON.stringify({
    STITCHFLOW_E2E_OWNER_PASSWORD: identities.find(({ label }) => label === 'owner').password,
    STITCHFLOW_E2E_EMPLOYEE_PASSWORD: identities.find(({ label }) => label === 'employee').password,
    STITCHFLOW_E2E_PATRON_PASSWORD: identities.find(({ label }) => label === 'patron').password,
    STITCHFLOW_E2E_PASSWORD: inviteePassword,
  }),
);
