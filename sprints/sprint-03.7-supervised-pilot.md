# Sprint 3.7 — Supervised Pilot Hardening

**Date:** 2026-11-08
**Milestone:** 1 — managed pilot for one boutique atelier
**Status:** BLOCKED — local hardening and hosted-backend journeys are verified against a fresh local
artifact; Vercel publication, live journeys, and backup/restore rehearsal remain incomplete.

## Delivered in source

- Fail-closed repository write boundary for missing atelier resolution.
- Tenant-scoped order status, tailor assignment, feedback status, and invitation revocation.
- Regression tests for missing tenant resolution and tenant-safe mutations.
- Duplicate `order_code` cross-tenant database fixture and patron-owned fitting visibility.
- Deterministic pilot/fitting provisioning and verification scripts. Pilot tenant B is isolation-only,
  not a second customer atelier.
- Pilot support, rollback, and disposable-project backup/restore rehearsal instructions.
- Production artifact checks reject retired/mismatched Supabase project references.
- Vercel static hosting selected and recorded in ADR-012; the deployment-provider readiness slice is
  tracked in Sprint 3.8.

## Evidence

- `npm run test:unit`: PASS, 3 tests.
- `npm run verify:db`: PASS; tenant isolation, duplicate human-key update, booking/RLS, and
  concurrency suites.
- `npm run lint`, `npm run build`, and the production artifact gate: PASS using
  `vite.pilot.config.ts`.
- `npm run verify:pilot`: PASS, 30/30 against hosted Supabase.
- Owner/employee/patron browser journeys: PASS, 3/3 against the fresh local production build
  connected to hosted Supabase.
- Protected fitting confirmation journey: PASS, 1/1 against the fresh local production build using
  the script-owned synthetic fixture.
- `npm run check:docs`: PASS; `git diff --check`: PASS.
- Initial browser attempts exposed a case-sensitive production sign-in locator and a stale fixture
  name. Locators now match the production landing and the unique seeded fitting by its explicit
  occasion/type. The full hosted journey was not run against the live site because the former
  Netlify deployment still serves the retired-project artifact.
- Full command details: `docs/evidence/2026-11-08_milestone-1-pilot-hardening.md`.

## Remaining before the pilot

1. Owner links the repository to Vercel, chooses the production domain, configures production
   Supabase variables, and allowlists the final Auth redirect URLs.
2. Publish the fresh artifact; verify its project ref and absence of demo identity markers.
3. Re-run owner, employee, patron, and booking-confirmation browser journeys against live Vercel.
4. Complete and record a backup/restore rehearsal on a disposable project before accepting
   non-synthetic pilot data.
5. Re-run all gates, make concern-specific commits, and only then consider version/tag/push. No
   version bump, tag, or push is claimed in this checkpoint.

Owner deployment setup: Vercel project, environment, domain, and Supabase Auth URL configuration.
