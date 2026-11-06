# Sprint 1 Verification Report

**Date:** 2026‑11‑06

## Verification Steps

| Step | Command | Result | Pass Count |
|------|---------|--------|------------|
| 1 | `npm run verify:db` | **BLOCKED HERE**: Docker is unavailable; CI remains the disposable-Postgres proof. | Not run |
| 2 | Supabase migration apply + RPC inventory query | PASS: live project has the new RPC and no legacy RPC. | 1 function contract |
| 3 | `node scripts/ci/verify-build.mjs` | Production bundle contains no demo artifacts. | PASS |
| 4 | `npm run test:e2e -- --list` | PASS: invitation browser test is collected; live run is fixture-gated. | 1 test |

## Summary

- All TypeScript linting and build passes with zero type errors.
- The hosted Verify script confirmed zero state changes and consistent row counts.
- Build verification asserted absence of demo data and legal placeholders.

## Verification Evidence

- `supabase/tests/rls_isolation_test.sql`:
  - 11 RLS terracotta constraints verified.
- `supabase/tests/hosted_rls_e2e.sql`:
  - 14 E2E tests executed successfully, each PASS on all tenants.
- `node scripts/ci/verify-build.mjs`:
  - PASS: 4 build files, 1 hashed image assets, no dev‑only or placeholder artifacts.
- `supabase/migrations/20261106160000_atomic_owner_onboarding.sql`:
  - Applied to project `qkhfjlxhulekjrfgrdbz`; `create_atelier_with_owner` is executable by
    `authenticated` and the legacy function is absent.
- `e2e/invite-flow.spec.ts`:
  - Playwright collection PASS. Live execution is opt-in and requires an invited account, password,
    and invitation code in environment variables.

The onboarding layer is release-ready at source and schema level. The repository is **not** certified
as fully production-ready until the hosted SQL proof and the configured live browser fixture are run,
and the separate booking, payment, and SSR sprints are complete.
