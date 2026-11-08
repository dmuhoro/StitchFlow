# Sprint 3.6 — Live-pilot booking integration checkpoint

**Date:** 2026-11-08
**Release checkpoint:** `v1.4.0-rc.1`
**Status:** local implementation verified; production pilot blocked.

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

## Evidence

- `docs/evidence/2026-11-07-pilot-readiness.md`
- Local `npm run verify:db`: RLS, booking, staff, and concurrency scenarios passed.
- Hosted SQL isolation proof passed with no fixture rows left behind.
- On 2026-11-08, lint, demo/Supabase builds, build artifact assertions, doc links, Playwright test
  collection, and `npm run verify:db` all passed (14 RLS scenarios, staff S1–S7). Details:
  `docs/evidence/2026-11-08_v1.4.0-rc.1.md`.

## Remaining before live pilot

1. Reconcile remote migration `20261106122030` with the actual production schema; do not mark it
   reverted without confirming its contents and effects.
2. Apply the tracked migrations only after the history is consistent.
3. Run hosted owner, employee, patron, and booking confirmation browser journeys with provisioned
   fixture identities and an isolated pending request/resource slot.
4. Reverify the deployed artifact and URL after migration and role-flow gates pass.

This checkpoint is a prerelease record, not production approval.
