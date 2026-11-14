# Sprint 3.9 — Hermetic E2E and backup/restore harness

**Status:** Local harness and CI DONE; hosted deployment, role journeys, and one booking confirmation
PASS; default build environment and live restore remain BLOCKED.

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
- The hosted pilot environment generator now emits the provisioned order-code and fitting-label
  overrides used by Playwright, omits a stale fixed booking date, and defaults to the current
  approved Vercel alias.

## Verification

Exact commands and observed exit codes are recorded in
[`../docs/evidence/2026-11-09_e2e-harness.md`](../docs/evidence/2026-11-09_e2e-harness.md).

- `npm run test:e2e:hermetic` — 6/6 journeys passed, then 6/6 on immediate re-run.
- `npm run verify:controls` — all 11 controls passed; expected negative cases exited 1 and
  blocked-precondition cases exited 2.
- Truncated local dump — rehearsal exited 1; full local dump restore and RLS suite exited 0.
- Local lint, unit, build, DB, and docs gates are reported individually in the evidence record.

## Remaining

- Live backup/restore is BLOCKED on authentication. The direct host is IPv6-only and unreachable
  from the rehearsal container; the configured Session pooler is reachable but Supabase rejects
  authentication before dumping. The owner must verify the generated pooler username and current
  database password, then rerun `npm run rehearse:restore:hosted`.
- The production build passes when unrelated credential-shaped public-prefixed shell exports are
  excluded for that command. The unfiltered agent shell still correctly fails closed; the user's
  terminal reports a clean environment. See
  [`../docs/evidence/2026-11-10_local-gate-rerun.md`](../docs/evidence/2026-11-10_local-gate-rerun.md).
- Hosted owner/employee/patron read-only role verification is PASS 3/3 on the approved Vercel
- Hosted owner/employee/patron read-only role verification is PASS 3/3 on the approved Vercel
  deployment. The protected hosted booking confirmation journey passed 1/1 after clearing a stale
  `.env.pilot` date override for the command. The request is now confirmed, with one prior cancelled
  booking retained; any further write-capable run requires renewed owner authorization. Details are
  in [`../docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](../docs/evidence/2026-11-10_pilot-gate-reconciliation.md).
- Remote CI was observed for `6f64cbd`: migration and hermetic E2E passed; quality failed because
  the landing-page smoke ran against the demo build instead of the Supabase-mode artifact. The
  smoke now runs through the hermetic job against the correct Supabase-mode artifact. The local
  correction and its passing regression evidence are in
  [`../docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](../docs/evidence/2026-11-10_pilot-gate-reconciliation.md);
  the corrected push and PR runs both passed on `ac22102`.
- Paid commercial use is BLOCKED on the Vercel Hobby plan; Pro is required. The selected
  non-commercial supervised pilot is not blocked by this tier.
- The hosted booking verification passed; the synthetic fixture is now consumed in its confirmed
  state. Any additional hosted write requires renewed owner authorization.
- Live backup/restore remains blocked on the rejected Session-pooler credentials; no source dump
  has run.
