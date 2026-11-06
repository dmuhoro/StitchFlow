# Sprint 01 — Real Data, Real Auth

**Status:** IN PROGRESS — onboarding and invitation layer shipped; remaining release gates are explicit below.
**Date:** 2026-11-05

## Planned
Supabase auth, owner onboarding, invites, repo-only mode, audit log, demo code removed, gates green.

## Shipped
- Dedicated StitchFlow project created and all migrations pushed (`qkhfjlxhulekjrfgrdbz`).
- `audit_log` + triggers on orders and measurements (`20261106120000`).
- `invitations` + `accept_invitation`, `lookup_invitation` (`20261106130000`, `20261106140000`).
- explicit `CreateAtelierScreen` integrated after auth (`84b7938`).
- invite redemption UI via `?invite=` + repository bridge (`862621d`).
- zero-demo production bundle split and strict `verify-build` assertions (`06b42a7`).
- context/demo literals removed where referenced; demo adapter remains demo-only.
- atomic `create_atelier_with_owner` RPC deployed and legacy onboarding function retired
  (`20261106160000_atomic_owner_onboarding.sql`).
- Playwright invitation flow added (`e2e/invite-flow.spec.ts`) and hosted SQL proof expanded to
  assert owner, employee, and client membership roles.

## Proven
- `npm run lint` PASS.
- `npm run build` PASS (demo and supabase modes).
- `VITE_DATA_MODE=supabase npm run verify:build` PASS.
- `npm run verify:db` PASS against disposable Postgres.
- `git push origin main` clean on the last layer.
- `npm run lint`, `npm run build`, `npm run verify:build`, and `npm run test:e2e -- --list` PASS.

## Remaining
- authenticated Playwright execution with a deliberately provisioned hosted invite fixture,
- production bundle assertion for zero credentials/tokens across app internals,
- final evidence checklist + tag release.
