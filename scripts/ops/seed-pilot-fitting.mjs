#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const secretsFile = process.env.PILOT_SECRETS_FILE ?? '.env.pilot';
if (!existsSync(secretsFile)) {
  console.error(`ERROR: ${secretsFile} not found.`);
  process.exit(1);
}

const fileEnv = {};
for (const line of readFileSync(secretsFile, 'utf8').split('\n')) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (!match) continue;
  const raw = match[2];
  fileEnv[match[1]] = raw.startsWith('"') && raw.endsWith('"')
    ? raw.slice(1, -1).replace(/\\(["\\])/g, '$1')
    : raw;
}

const env = key => process.env[key] ?? fileEnv[key] ?? '';
const url = env('SUPABASE_PILOT_URL').replace(/\/+$/, '');
const key = env('SUPABASE_PILOT_PUBLISHABLE_KEY');
const atelierId = env('PILOT_ATELIER_A');
const fixtureId = 'a3000000-0000-4000-8000-00000000000a';

if (!url || !key || !atelierId) {
  console.error('ERROR: pilot Supabase URL, publishable key, and atelier id are required.');
  process.exit(1);
}

async function signIn(email, password) {
  if (!email || !password) throw new Error('Pilot owner and patron credentials are required.');
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Pilot sign-in failed (HTTP ${response.status}).`);
  const session = await response.json();
  const payload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString('utf8'));
  return { token: session.access_token, userId: payload.sub, email };
}

async function request(session, path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${session?.token ?? key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`Pilot fixture request failed (HTTP ${response.status}).`);
  return body;
}

const owner = await signIn(env('STITCHFLOW_E2E_OWNER_EMAIL'), env('STITCHFLOW_E2E_OWNER_PASSWORD'));
const patron = await signIn(env('STITCHFLOW_E2E_PATRON_EMAIL'), env('STITCHFLOW_E2E_PATRON_PASSWORD'));

const ownerMembers = await request(
  owner,
  `members?select=id,atelier_id,role&id=eq.${owner.userId}&atelier_id=eq.${atelierId}`,
);
const patronMembers = await request(
  patron,
  `members?select=id,atelier_id,role,full_name&id=eq.${patron.userId}&atelier_id=eq.${atelierId}`,
);
if (ownerMembers?.[0]?.role !== 'owner' || patronMembers?.[0]?.role !== 'client') {
  throw new Error('Pilot identities do not have the expected roles in the selected atelier.');
}

const fittingPath =
  `appointments?select=id,atelier_id,client_id,status,source&id=eq.${fixtureId}` +
  `&atelier_id=eq.${atelierId}&source=eq.pilot`;
const fixtures = await request(owner, fittingPath);
if (fixtures?.length !== 1 || fixtures[0].status !== 'pending') {
  throw new Error('Expected exactly one pending, script-owned pilot fitting fixture.');
}
if (fixtures[0].client_id && fixtures[0].client_id !== patron.userId) {
  throw new Error('Refusing to reassign a pilot fitting already linked to another patron.');
}

if (!fixtures[0].client_id) {
  const updated = await request(owner, fittingPath, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      client_id: patron.userId,
      client_name: patronMembers[0].full_name,
      client_email: patron.email,
    }),
  });
  if (updated?.length !== 1 || updated[0].client_id !== patron.userId) {
    throw new Error('Owner-scoped fitting update did not return the expected patron-linked row.');
  }
}

const patronFittings = await request(
  patron,
  `appointments?select=id,client_id,status&id=eq.${fixtureId}&atelier_id=eq.${atelierId}`,
);
if (patronFittings?.length !== 1 || patronFittings[0].client_id !== patron.userId) {
  throw new Error('Patron RLS did not expose the linked pilot fitting.');
}

console.log('PASS: the pending pilot fitting is linked to its patron and visible through patron RLS.');
