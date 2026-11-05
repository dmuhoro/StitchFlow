# Sprint 01 — Real Data, Real Auth

**Status:** IN PROGRESS — host + source changes shipped; demo isolation/gates still open for full completion.
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

## Proven
- `npm run lint` PASS.
- `npm run build` PASS (demo and supabase modes).
- `VITE_DATA_MODE=supabase npm run verify:build` PASS.
- `npm run verify:db` PASS against disposable Postgres.
- `git push origin main` clean on the last layer.

## Remaining
- full owner invitation issuance and authenticated e2e onboarding proofs,
- production bundle assertion for zero credentials/tokens across app internals,
- final evidence checklist + tag release.
