# Sprint 3.6 — Live-pilot booking integration checkpoint

**Date:** 2026-11-08
**Release checkpoint:** `v1.4.0-rc.1`
**Status:** local implementation verified; hosted schema repaired; hosted browser pilot blocked on
provisioned identities.

The repository's earlier checkpoints remain visible as `v1.0.0`, `v1.0.1`, `v1.1.0`, `v1.2.0`,
and `v1.3.0`; this sprint continues that release trail with a tagged prerelease rather than
overwriting prior milestones.

## Delivered

- Owner booking UI for resource setup, availability, holding, confirmation, cancellation, and list
  refresh through the protected booking RPCs.
- Database guard and synchronization between confirmed bookings and legacy fitting requests.
- Patron appointment insert policy restricted to own-atelier pending requests; owner inserts via this
  policy are denied.
- Denied anonymous appointment inserts and disabled the live visitor request form until a safe guest
  boundary exists.
- Currency-aware order terms and removal of unsupported financial growth claims.
- Opt-in hosted role and booking browser tests.
- Production deploy build enforcement and a CI negative test that proves a demo-mode artifact is
  rejected.
- Hosted schema repair (2026-11-08): remote `20261106122030` was proven equivalent to local
  `20261106160000`, the history row was recorded under the canonical version, and the seven missing
  migrations were applied. Hosted RLS/onboarding proof passes.

## Evidence

- `docs/evidence/2026-11-07-pilot-readiness.md`
- Local `npm run verify:db`: RLS, booking, staff, and concurrency scenarios passed.
- Hosted SQL isolation proof passed with no fixture rows left behind.
- On 2026-11-08, lint, demo/Supabase builds, build artifact assertions, doc links, Playwright test
  collection, and `npm run verify:db` all passed (14 RLS scenarios, staff S1–S7). Details:
  `docs/evidence/2026-11-08_v1.4.0-rc.1.md`.
- Hosted repair on 2026-11-08: `db push --dry-run` up to date, migration list matched, hosted
  verification passed with unchanged row counts. Details:
  `docs/evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md`.

## Remaining before live pilot

1. Provision owner/employee/patron identities (or deliberately seed pilot tenants). Production
   currently has 0 auth users and 0 ateliers/members, so the hosted browser journeys cannot run.
2. Run the hosted owner, employee, patron, and booking confirmation journeys with a unique pending
   request/resource slot.
3. Restore Netlify account credits (owner billing action), then publish the corrected artifact and
   re-verify the live URL and production bundle. Netlify currently rejects deploys with
   `403 Account credit usage exceeded`, so the live bundle still embeds the retired project
   `vpathqzkaqdtbykumxeo`.
4. Keep guest booking closed until the rate-limited edge boundary exists.

This checkpoint is a prerelease record, not production approval.
