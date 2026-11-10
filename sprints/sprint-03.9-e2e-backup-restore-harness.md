# Sprint 3.9 — Hermetic E2E and backup/restore harness

**Status:** DONE locally and CI green on push/PR; hosted deployment and live restore remain BLOCKED.

## Goal

Make the browser and recovery checks repeatable from a clean checkout without production
credentials or production database access.

## Delivered

- `.env.test` points to loopback and identifies the local E2E fixture atelier.
- `scripts/e2e/hermetic.sh` starts a disposable Supabase stack, removes ambient hosted configuration,
  resets/reseeds the pending fitting through `npm run seed:pilot-fitting`, and runs Playwright
  against the local Auth and PostgREST services.
- Local fixture passwords are generated per run and passed to Playwright in memory. Supabase
  service-role output is never written to logs or evidence.
- Booking dates are calculated in `Africa/Nairobi`; tests cover the horizon and closed Sunday.
- `scripts/ops/backup-restore-rehearsal.sh` validates a source dump, restores to disposable
  PostgreSQL, compares source/restore row counts, and runs the RLS suite against the restored DB.
- `.github/workflows/ci.yml` covers branch pushes and pull requests and adds a credential-free
  hermetic E2E job plus negative controls.
- Readiness, changelog, evidence, and sprint records separate local proof from hosted credential
  blockers and the Vercel plan-tier blocker.

## Verification

Exact commands and observed exit codes are recorded in
[`../docs/evidence/2026-11-09_e2e-harness.md`](../docs/evidence/2026-11-09_e2e-harness.md).

- `npm run test:e2e:hermetic` — 6/6 journeys passed, then 6/6 on immediate re-run.
- `npm run verify:controls` — all 7 controls passed; expected negative cases exited 1.
- Truncated local dump — rehearsal exited 1; full local dump restore and RLS suite exited 0.
- Local lint, unit, build, DB, and docs gates are reported individually in the evidence record.

## Remaining

- Live backup/restore is BLOCKED on `SOURCE_DB_URL` and the production database password.
- Hosted browser verification is BLOCKED until an owner-approved deployment of the reviewed source.
- Remote CI was observed for `6f64cbd`: migration and hermetic E2E passed; quality failed because
  the landing-page smoke ran against the demo build instead of the Supabase-mode artifact. The
  smoke now runs through the hermetic job against the correct Supabase-mode artifact. The local
  correction and its passing regression evidence are in
  [`../docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](../docs/evidence/2026-11-10_pilot-gate-reconciliation.md);
  the corrected push and PR runs both passed on `ac22102`.
- Commercial use is BLOCKED on the Vercel Hobby plan; Pro is required.
- No deployment, push, tag, version bump, or production Supabase access is part of this sprint.
