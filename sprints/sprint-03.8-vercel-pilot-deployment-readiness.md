# Sprint 3.8 — Vercel Pilot Deployment Readiness

**Date:** 2026-11-08
**Milestone:** 1 — managed pilot for one boutique atelier
**Status:** Hosted deployment READY and owner/employee/patron read-only journeys PASS 3/3.
Hosted booking awaits owner approval to reset the synthetic fitting; live restore remains blocked
on credentials.

## Delivered in source

- Recorded the owner-selected Vercel static-SPA deployment in ADR-012; the TanStack Start entry is
  not part of this deployment.
- Kept `npm run build` on `vite.pilot.config.ts` and removed unused TanStack/Netlify plugin imports
  from the root Vite config.
- Added Vercel SPA fallback, cache/security headers, and project build settings in `vercel.json`.
- Added a Vercel production-context negative proof so CI rejects a demo-mode production artifact.
- Added a public-entry browser smoke test to run against the local Vite preview in CI.
- Tightened hosted role/booking selectors to the exact landing-page sign-in button. A local run
  passed the public smoke and skipped five hosted tests when live account/fixture variables were
  deliberately disabled; this is not hosted-flow evidence.
- Added a forward-only order-financial audit migration and RLS regression proving that owners can
  inspect their edits while staff and patrons cannot read financial snapshots.
- Applied `20261108173000_audit_order_financials.sql` to production on 2026-11-08; remote migration
  list and dry run confirmed parity. The rollback-only hosted RLS proof passed.
- Updated deployment, rollback, architecture, current-state, and release-readiness documentation.

## Evidence

See [`../docs/evidence/2026-11-08_vercel-pilot-readiness.md`](../docs/evidence/2026-11-08_vercel-pilot-readiness.md)
for exact command results.

## Remaining before the pilot

1. Obtain owner approval to reset only the script-owned synthetic fitting, then run the hosted
   booking confirmation journey. No fixture reset or booking write has occurred.
2. Verify a Vercel source-build using the repository's `.nvmrc` Node.js 20; the approved prebuilt
   deployment used Node.js 22.22.1 while project settings reported 26.x.
3. Complete and record a live-source backup/restore rehearsal after receiving `SOURCE_DB_URL` and
   the production database password through an approved secret channel.
4. Upgrade Vercel to Pro only before any commercial pilot; the current supervised pilot is
   non-commercial.

The approved deployment is recorded in
[`../docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](../docs/evidence/2026-11-10_pilot-gate-reconciliation.md).
No new version bump, release tag, or production-ready sign-off is claimed by this sprint.
