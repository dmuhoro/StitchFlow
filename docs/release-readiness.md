# Release Readiness

> The authoritative to-do list. A gate is DONE only with cited evidence.
> Last updated: 2026-11-10 (hosted deployment and three read-only roles pass; booking fixture,
> hosted restore authentication, and inherited build-shell environment remain blocked).

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold: docs, ADRs, sprints, agents, scripts | DONE | `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain from empty database | DONE | `docs/evidence/2026-11-01_database_chain.md`, re-proven 2026-11-05 |
| L2 | RLS isolation suite green | DONE | 12 scenarios + structural assertions: `docs/evidence/2026-11-05_sprint-0-verification.md` |
| L3 | Local imagery bundled with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md`; scope limits in the Sprint 0 audit |
| L5 | CI runs lint, unit, browser smoke, build, docs, DB verification | **PASS — push and PR** | Corrected commit `ac22102`: push run [42756978325](https://github.com/dmuhoro/StitchFlow/actions/runs/42756978325) and PR run [42756984649](https://github.com/dmuhoro/StitchFlow/actions/runs/42756984649) passed all three jobs, including hermetic E2E and DB. The prior demo-artifact/production-smoke mismatch is recorded in [`evidence/2026-11-10_pilot-gate-reconciliation.md`](evidence/2026-11-10_pilot-gate-reconciliation.md). |
| L6 | Release versioned, tagged, pushed | DONE | `docs/evidence/2026-11-01_release.md` (tag `v1.0.0`, remote ref verified) |
| L7 | Cleanup complete, lockfile committed, tree clean | DONE | `npm ci` succeeded on 2026-11-05; dead dependencies removed in `1bd06bb` |
| L8 | README, CHANGELOG, sprints updated | DONE | `CHANGELOG.md` 1.0.0/1.0.1, sprint records, evidence index |
| L9 | Deployment verified | **PASS — approved production deployment READY** | Deployment `dpl_3psUv1F9c9Gq9FqKLx8bkdRXyp13`, alias `https://stitchflow-coral.vercel.app`, HTTP 200; hosted evidence in [`evidence/2026-11-10_pilot-gate-reconciliation.md`](evidence/2026-11-10_pilot-gate-reconciliation.md). |
| L10 | Production deploy fails closed on a demo-mode artifact | DONE — source + CI | `scripts/ci/verify-build.mjs` (`VERCEL_ENV=production`), `postbuild`, CI negative proof; `docs/evidence/2026-11-08_v1.4.0-rc.1.md` |
| L11 | Tenant-safe human-key writes and missing-atelier fail-closed guard | **PASS locally; hosted role/RLS proof PASS, hosted duplicate-code SQL not run** | `npm run test:unit`, `npm run verify:db` (including duplicate `order_code` across tenants), and `npm run verify:pilot` (30/30); hosted SQL fixture: `supabase/tests/hosted_rls_e2e.sql` |
| L12 | Owner/staff/patron hosted workflows | **Local hermetic PASS 6/6 twice; hosted roles PASS 3/3; booking BLOCKED** | The hosted role journeys pass against the approved Vercel deployment. Booking confirmation stopped before any booking write because the guarded script-owned pending-fitting fixture was unavailable. |
| L13 | Pilot support, rollback, and backup/restore rehearsal | **Local-source rehearsal PASS; hosted restore BLOCKED on authentication** | `npm run rehearse:restore` rejects malformed local dumps, restores a full dump, and passes the RLS suite. Direct host is IPv6-unreachable; Session pooler is reachable but rejected authentication (exit 2 before dump). See `docs/evidence/2026-11-10_hosted-rehearsal-precondition.md` and `docs/evidence/2026-11-10_local-gate-rerun.md`. |
| L14 | Owner financial edits audited without exposing snapshots to staff/patrons | **Migration applied; hosted general RLS + local trigger proof PASS** | Remote migration list reverified current through `20261108173000`; see `docs/evidence/2026-11-08_pilot-release-execution.md`, `STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted`, and `npm run verify:db` |

## Verification boundary — 2026-11-10

### Verified locally

- The hermetic E2E harness starts a disposable Supabase stack with Auth and PostgREST, resets it
  from tracked migrations and `supabase/seed.sql`, and runs all six browser journeys twice. The
  pending fitting is recreated by `npm run seed:pilot-fitting` before each run.
- Eleven negative controls reject the configured demo/build failures, including a protected browser
  journey run against a demo artifact and a demo artifact checked in a Vercel production context.
- The backup/restore script rejects a 1,000-byte truncated local dump with exit 1, then restores a
  complete local dump and runs `supabase/tests/rls_isolation_test.sql` successfully.
- These checks use loopback-only configuration and no hosted database credential.
- The latest local rerun passed lint, unit, documentation links, database, hermetic browser,
  negative-control, and local restore checks. The production build and artifact gate pass when run
  with two unrelated credential-shaped shell exports excluded for that command. Plain `npm run build`
  in this agent shell correctly refuses those inherited names; the guard reports names only. The
  tracked dotenv files are clean. See
  [`evidence/2026-11-10_local-gate-rerun.md`](evidence/2026-11-10_local-gate-rerun.md).
- The CI failure is reproduced by `VITE_DATA_MODE=demo npm run build` followed by
  `npm run test:e2e -- --grep "public entry renders"`: the smoke expects the Supabase-mode
  production landing page, while a demo build renders the demo portfolio. This is a CI wiring
  mismatch; the same smoke is part of the credential-free hermetic suite.
- The CI workflow now runs that public-entry smoke only through the hermetic E2E job. On 2026-11-10,
  the clean-stack suite passed 6/6; lint, unit, build, DB, docs, controls, and local restore gates
  also passed. Exact commands and exits: [`evidence/2026-11-10_pilot-gate-reconciliation.md`](evidence/2026-11-10_pilot-gate-reconciliation.md).
- Corrected push and pull-request workflows both pass all three CI jobs on `ac22102`: [push](https://github.com/dmuhoro/StitchFlow/actions/runs/42756978325),
  [PR](https://github.com/dmuhoro/StitchFlow/actions/runs/42756984649).

### Verified on the approved hosted deployment

- Vercel production deployment `dpl_3psUv1F9c9Gq9FqKLx8bkdRXyp13` is READY at
  `https://stitchflow-coral.vercel.app`; an HTTP HEAD request returned 200.
- Owner, employee, and patron read-only journeys passed 3/3 using the hosted pilot order codes.
  The exact command and outcome are in
  [`evidence/2026-11-10_pilot-gate-reconciliation.md`](evidence/2026-11-10_pilot-gate-reconciliation.md).
- Hosted booking confirmation is **BLOCKED**. The guarded fixture check did not find exactly one
  pending script-owned fitting. The check did not reset or modify the fixture, and no booking was
  held or confirmed. Owner approval is required before changing that fixture.
- The prebuilt deployment used Node.js 22.22.1; Vercel project settings reported Node.js 26.x while
  `.nvmrc` specifies 20. A Vercel source-build using the repository version is not yet verified.

### Blocked on environment / authorization

- The direct database host is IPv6-unreachable. The owner configured a Session pooler and the
  endpoint was reachable, but Supabase rejected authentication; `npm run rehearse:restore:hosted`
  exited 2 before dumping. Verify the Dashboard-generated pooler username and current database
  password, reset the password if uncertain, then re-enter the URI with `npm run ops:set-source-db`.
  No hosted dump or restore has been performed.
- The ordinary `npm run build` in this agent shell is blocked by credential-shaped public-prefixed
  variable names in the inherited shell environment. The build guard correctly refuses to proceed.
  The owner reports their `npm run preflight` is clean; this environment discrepancy does not change
  tracked files. The production build passed with those unrelated exported names excluded for the
  command, and no secret value was read or printed.

### Blocked on fixture approval

- Before the hosted booking journey can run, the repository owner must authorize resetting or
  recreating only the script-owned synthetic fitting fixture. If a test booking exists for that
  fixture, its release must also be explicitly limited to that synthetic booking. Do not run
  `npm run seed:pilot` against production.

### Blocked on plan tier

- Vercel project `stitchflow` is on Hobby, which does not permit commercial use. Upgrade to Pro
  before a paid pilot. The selected supervised pilot is non-commercial, so this is not a blocker
  for that scope.

## Sprint 0a verification gates (2026-11-05)

| # | Gate | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Owner reads only their atelier | PASS | `docs/evidence/2026-11-05_sprint-0-verification.md` |
| 2 | Employee cannot read another atelier | PASS | same |
| 3 | Patron reads only own records | PASS | same |
| 4 | Anonymous reads only published lookbook | PASS | same |
| 5 | Patron cannot update order/balance/measurement | PASS | same |
| 6 | Staff cannot change tenant IDs | PASS | same |
| 7 | Deactivated members lose access | PASS | same |
| 8 | Appointment capacity and double-booking | **FAIL (legacy store)** | same — no exclusion constraint on `appointments`; 2 overlapping rows accepted |

## Sprint 3 booking-engine gates (2026-11-07)

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| B1 | Expand-only migration adds resources, availability, blackouts, bookings, ledger, and RPCs | DONE | `supabase/migrations/20261107120000_booking_engine.sql` |
| B2 | GiST exclusion constraint covers `held` and `confirmed` per resource | DONE | RPC suite B23; `verify:db` |
| B3 | Booking writes are RPC-only; tenant, role, availability, and blackout checks hold | DONE | RPC suite B1–B12, B21–B22 |
| B4 | Expiry sweep and idempotent replay/conflict semantics | DONE | RPC suite B13, B16–B20 |
| B5 | 200 attempts / 50 concurrent on one slot: 1 success, 199 `slot_unavailable`, 0 duplicates | DONE — local and CI | `docs/evidence/2026-11-07-booking-engine.md`; CI run [42371377892](https://github.com/dmuhoro/StitchFlow/actions/runs/42371377892) |
| B6 | Confirmed fitting must have a protected resource booking | **DONE — local and hosted schema** | Status guard applied; `npm run verify:db`; hosted migration apply in `docs/evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md` |
| B7 | Owner UI calls availability, hold, confirm, cancel, and resource setup | **Local database proof PASS; hosted role journeys PASS; hosted booking BLOCKED** | Local `npm run verify:db` and hosted owner/employee/patron read-only journeys pass. Booking awaits a pending script-owned fitting; no booking was confirmed. |
| B8 | Guest rate limits and bot challenge | **CLOSED BY FAIL-CLOSED DISABLEMENT** | Anonymous appointment inserts and the live visitor booking form are disabled until the edge boundary is deployed |
| B9 | Client and staff cannot mint a confirmed appointment outside the booking RPCs | **DONE — local and hosted schema** | `20261107220000_restrict_client_appointment_insert.sql`; RLS tests 13–14, staff S7a–S7d; applied to production in rc.2 |
| B10 | Production migration history matches the tracked chain | **PASS — current** | `CI=1 supabase migration list --remote` shows local and remote through `20261108173000`; `CI=1 supabase db push --dry-run --remote` returned `upToDate: true` |

## Production-readiness verdict

`v1.4.0-rc.2` remains the current package version and is a **prerelease checkpoint**, not a certified
production atelier system. The Supabase-mode artifact gate rejects demo identities and
retired/mismatched project refs. The booking staff UI, insert boundary, fail-closed request guard,
and financial audit boundary pass local database verification. Production schema parity is verified
through `20261108173000`; the financial audit migration is applied. Tenant-safe human-key writes
pass unit and local database tests. The approved Vercel deployment is READY and hosted
owner/employee/patron read-only journeys pass 3/3. Hosted booking confirmation remains blocked
because the script-owned pending-fitting precondition is unmet; no booking was made or fixture
reset. The hermetic harness passes all six browser journeys twice, seven artifact/demo-mode negative
controls, and the local dump → restore → RLS rehearsal; see
`docs/evidence/2026-11-09_e2e-harness.md`. A restore of live pilot data has not been made:

1. `S0-P0-01` — **closed in source and at the deploy boundary**. Supabase-mode build and
   `verify:build` reject demo identities, PIN, credential cards, tenant slugs, and demo lookbook
   copy. `postbuild` runs the assertion on every build, and a Vercel `VERCEL_ENV=production` deploy
   fails unless `VITE_DATA_MODE=supabase` with real Supabase values. CI proves both the Netlify
   `CONTEXT=production` and Vercel `VERCEL_ENV=production` gates reject a demo artifact. Evidence:
   `docs/evidence/2026-11-08_v1.4.0-rc.1.md` and the current Vercel readiness evidence.
2. `S0-P0-02` — **code changed; local and hosted schema proof PASS**. The new migration guards
   confirmation against the protected booking store and disables anonymous direct inserts. The
   update-only guard was still bypassable by a client `INSERT`; migration
   `20261107220000_restrict_client_appointment_insert.sql` now limits a client to an own-tenant
   `pending` request with no assigned tailor. The owner UI uses
   `hold_slot`/`confirm_booking`/`cancel_booking`. All seven pending migrations are now applied to
   production with a matched history; the browser confirmation journey passes against the fresh
   local artifact. The current hosted role journeys pass; hosted booking awaits the synthetic
   fitting precondition.
   Evidence: `docs/evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md`.

Full prioritized list: `docs/audit/2026-11-05_sprint-0-audit.md`.

## P0 definitions

- Cross-tenant read or write.
- Patron able to read another patron's balance.
- Demo code or demo credentials present in a production artifact.
- Appointment double-booking accepted server-side.
- Migration chain cannot reproduce the queried schema.
- Secret committed.

## Blocked items

| Item | Blocker | Owner |
|------|---------|-------|
| Hosted Supabase schema parity / remote migration apply | Applied and verified current through `20261108173000` by remote list and dry-run | Engineering; hosted migration issue resolved |
| Hosted booking confirmation journey | Owner/employee/patron role journeys pass 3/3; guarded fitting precondition is unmet and no booking has been made | Repository owner — authorize reset/recreation of only the script-owned synthetic fitting |
| Current source build/type-check | `npm run lint` and `npm run build` pass using `vite.pilot.config.ts`; root config is also static and no TanStack plugin is used | Engineering |
| Vercel source-build parity | Approved prebuilt artifact is READY; Vercel reports Node.js 26.x while `.nvmrc` specifies 20, and the prebuilt artifact used Node.js 22.22.1 | Repository owner — align Node.js versions and verify a source build |
| Pilot backup/restore rehearsal | Local dump → restore → RLS rehearsal passes with self-controls; a live dump/restore of pilot data has not been made | Repository owner — provide `SOURCE_DB_URL` and the production database password |
| Vercel commercial use | Project `stitchflow` is on the Hobby plan, which forbids commercial use | Repository owner — upgrade to Pro before a paid pilot |
| Regional availability | Single region `iad1`; accepted for the supervised pilot without an uptime promise | **DEFERRED TO V2** — multi-region failover is not a one-atelier pilot prerequisite |
| Payment gateway credentials | Must live in a server-side secret store; no credentials provided | Repository owner |
| WhatsApp Business API sender and templates | Meta approval required | Atelier operator |
| Kenya/Nigeria data-protection review | Human legal/privacy decision | Repository owner |

## Sign-off rule

The release agent may not mark a gate DONE from narrative. Each row cites a file in
[`evidence/`](evidence/README.md) or a command that was run. Deployment and hosted-database claims
have a named human owner and are never reported as agent-verified.

## Milestone definition (2026-11-08)

- **Milestone 1 (target now):** one boutique atelier, supervised pilot, controlled staff/owner workflows; no guest self-booking, no payments, no media/trans actional communications yet.
- **v2 (public-ready):** any atelier/customer flow, including guest booking boundary, payments,
  transactional comms, SSR, broad operational analytics, multi-region failover, backups, and
  support operations.

### Highest-leverage Milestone 1 work
1. Get owner approval to reset only the script-owned synthetic fitting, then complete the hosted booking journey.
2. Align Vercel Node.js with `.nvmrc` and verify a source build.
3. Obtain `SOURCE_DB_URL` and the production database password through an approved secret channel, then rehearse restore into a disposable target.
4. Keep the supervised single-atelier support and rollback runbook current.
5. Keep payments, SSR, guest booking, multi-region failover, and broad analytics deferred to v2.
