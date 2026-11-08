# Sprint 3.8 — Vercel Pilot Deployment Readiness

**Date:** 2026-11-08
**Milestone:** 1 — managed pilot for one boutique atelier
**Status:** BLOCKED — Vercel is configured and the migration is applied, but hosted E2E is 1/6,
backup/restore was not run, and the branch push is blocked by missing GitHub workflow scope.

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

1. Resolve the remote E2E/deployed-artifact mismatch in issue #6; current live suite returned
   1 pass and 5 failures.
2. Push the reviewed branch after GitHub OAuth receives the `workflow` scope required by the CI
   workflow change, then publish a Vercel preview and rerun all six browser journeys.
3. Complete and record a disposable-project backup/restore rehearsal. The first local Supabase
   startup failed on Docker image TLS timeouts and default port conflicts; no production dump was
   created.
4. Capture a successful live booking screenshot only after the current source is deployed and the
   live booking flow passes.
5. Re-run all gates and make concern-specific commits before considering a version bump/tag.

No production deployment, release tag, or production-ready sign-off is claimed by this sprint.
