# Sprint 3.8 — Vercel Pilot Deployment Readiness

**Date:** 2026-11-08
**Milestone:** 1 — managed pilot for one boutique atelier
**Status:** BLOCKED — code-side Vercel configuration and local checks are in place; owner project
setup, production publication, live browser verification, and the backup/restore rehearsal remain.

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
- Updated deployment, rollback, architecture, current-state, and release-readiness documentation.

## Evidence

See [`../docs/evidence/2026-11-08_vercel-pilot-readiness.md`](../docs/evidence/2026-11-08_vercel-pilot-readiness.md)
for exact command results.

## Remaining before the pilot

1. Owner reviews and applies `20261108173000_audit_order_financials.sql` to production, then runs the
   hosted database verification for the financial audit and RLS boundary. A read-only audit on
   2026-11-08 confirmed the migration is absent remotely; see issue #5.
2. Owner links this repository to the Vercel project, chooses the production domain, configures
   Production Supabase variables and Preview demo mode, and allowlists the final Supabase Auth URLs.
3. Owner publishes the production build; engineering verifies the served bundle targets the active
   Supabase project and contains no demo markers.
4. Engineering runs owner, employee, patron, and protected booking journeys against the live
   production URL with the provisioned test identities and synthetic fixture.
5. Owner completes and records the disposable-project backup/restore rehearsal before accepting
   non-synthetic pilot data.
6. Re-run all gates, make concern-specific commits, and only then consider a release version/tag.
7. Complete the backup/restore rehearsal and capture a synthetic live booking screenshot/video.

No production deployment, release tag, or production-ready sign-off is claimed by this sprint.
