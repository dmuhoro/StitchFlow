# Release Readiness

> The authoritative to-do list. A gate is DONE only with cited evidence.
> Last updated: 2026-11-09 (hermetic E2E harness: 6/6 browser journeys twice, 7/7 negative
> controls, local restore rehearsal; hosted deploy and live restore remain blocked).

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold: docs, ADRs, sprints, agents, scripts | DONE | `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain from empty database | DONE | `docs/evidence/2026-11-01_database_chain.md`, re-proven 2026-11-05 |
| L2 | RLS isolation suite green | DONE | 12 scenarios + structural assertions: `docs/evidence/2026-11-05_sprint-0-verification.md` |
| L3 | Local imagery bundled with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md`; scope limits in the Sprint 0 audit |
| L5 | CI runs lint, unit, browser smoke, build, docs, DB verification | DONE — source; remote run BLOCKED | `.github/workflows/ci.yml` (all-branch push/PR, credential-free hermetic `e2e` job); pending harness changes are not pushed, and the available GitHub token lacks `workflow` scope |
| L6 | Release versioned, tagged, pushed | DONE | `docs/evidence/2026-11-01_release.md` (tag `v1.0.0`, remote ref verified) |
| L7 | Cleanup complete, lockfile committed, tree clean | DONE | `npm ci` succeeded on 2026-11-05; dead dependencies removed in `1bd06bb` |
| L8 | README, CHANGELOG, sprints updated | DONE | `CHANGELOG.md` 1.0.0/1.0.1, sprint records, evidence index |
| L9 | Deployment verified | **BLOCKED — no preview deployment created** | `vercel build --prod` succeeded, but `vercel deploy --prebuilt` rejected the production-target artifact for a preview deployment; see `docs/evidence/2026-11-09_preview-deploy-blocked.md`. |
| L10 | Production deploy fails closed on a demo-mode artifact | DONE — source + CI | `scripts/ci/verify-build.mjs` (`VERCEL_ENV=production`), `postbuild`, CI negative proof; `docs/evidence/2026-11-08_v1.4.0-rc.1.md` |
| L11 | Tenant-safe human-key writes and missing-atelier fail-closed guard | **PASS locally; hosted role/RLS proof PASS, hosted duplicate-code SQL not run** | `npm run test:unit`, `npm run verify:db` (including duplicate `order_code` across tenants), and `npm run verify:pilot` (30/30); hosted SQL fixture: `supabase/tests/hosted_rls_e2e.sql` |
| L12 | Owner/staff/patron hosted workflows | **Local hermetic PASS 6/6 twice; hosted BLOCKED** | `npm run test:e2e:hermetic` against disposable local Supabase with fixture reset, including invite redemption; hosted bundle reported as stale by the owner. See `docs/evidence/2026-11-09_e2e-harness.md`. |
| L13 | Pilot support, rollback, and backup/restore rehearsal | **Local-source rehearsal PASS; hosted restore BLOCKED** | `npm run rehearse:restore` rejects a real truncated local dump (exit 1), then restores a full dump and passes the RLS suite (exit 0). A live dump/restore needs `SOURCE_DB_URL` and the production database password. `docs/runbooks/pilot-operations.md`, `docs/evidence/2026-11-09_e2e-harness.md` |
| L14 | Owner financial edits audited without exposing snapshots to staff/patrons | **Migration applied; hosted general RLS + local trigger proof PASS** | Remote migration list reverified current through `20261108173000`; see `docs/evidence/2026-11-08_pilot-release-execution.md`, `STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted`, and `npm run verify:db` |

## Verification boundary — 2026-11-09

### Verified locally

- The hermetic E2E harness starts a disposable Supabase stack with Auth and PostgREST, resets it
  from tracked migrations and `supabase/seed.sql`, and runs all six browser journeys twice. The
  pending fitting is recreated by `npm run seed:pilot-fitting` before each run.
- Seven negative controls reject the configured demo/build failures, including a protected browser
  journey run against a demo artifact and a demo artifact checked in a Vercel production context.
- The backup/restore script rejects a 1,000-byte truncated local dump with exit 1, then restores a
  complete local dump and runs `supabase/tests/rls_isolation_test.sql` successfully.
- These checks use loopback-only configuration and no hosted database credential.

### Blocked on credentials / authorization

- The pending harness changes are not pushed. The available GitHub token lacks the `workflow`
  scope needed to publish the modified Actions workflow; no remote CI run is claimed.
- A live backup/restore needs `SOURCE_DB_URL` and the production database password. Neither was
  supplied or used.
- Hosted E2E requires an owner-approved deployment of the reviewed source. The owner reports the
  current deployed bundle (`index-BPtRE36V.js`) predates commit `bb751ad`; this attribution was not
  revalidated against the hosted project in this task.

### Blocked on plan tier

- Vercel project `stitchflow` is on Hobby, which does not permit commercial use. Upgrade to Pro
  before a paid pilot. This plan limitation is separate from the local harness and its CI proof.

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
| B7 | Owner UI calls availability, hold, confirm, cancel, and resource setup | **Local database proof PASS; live UI BLOCKED** | Local `npm run verify:db` passes booking RPC suite. Remote `e2e/booking-confirm.spec.ts` timed out before sign-in/slot selection; no booking was confirmed. |
| B8 | Guest rate limits and bot challenge | **CLOSED BY FAIL-CLOSED DISABLEMENT** | Anonymous appointment inserts and the live visitor booking form are disabled until the edge boundary is deployed |
| B9 | Client and staff cannot mint a confirmed appointment outside the booking RPCs | **DONE — local and hosted schema** | `20261107220000_restrict_client_appointment_insert.sql`; RLS tests 13–14, staff S7a–S7d; applied to production in rc.2 |
| B10 | Production migration history matches the tracked chain | **PASS — current** | `CI=1 supabase migration list --remote` shows local and remote through `20261108173000`; `CI=1 supabase db push --dry-run --remote` returned `upToDate: true` |

## Production-readiness verdict

`v1.4.0-rc.2` remains the current package version and is a **prerelease checkpoint**, not a certified production atelier system. The
Supabase-mode artifact gate rejects demo identities and retired/mismatched project refs. The booking
staff UI, insert boundary, fail-closed request guard, and new financial audit boundary pass local
database verification. Production schema parity is verified through `20261108173000`; the
`20261108173000_audit_order_financials.sql` migration was applied. Tenant-safe
human-key writes pass unit and local database tests. Six hosted identities and a pilot fitting
fixture exist. A fresh static production build passes, the hosted publishable-key proof passes
30/30, owner/employee/patron browser journeys pass 3/3, and protected booking confirmation passes 1/1
against the fresh local bundle connected to hosted Supabase. The booking journey used the
script-owned synthetic fixture. As of 2026-11-09 the hermetic harness passes all six browser
journeys (including invitation redemption) twice in a row, seven artifact/demo-mode negative
controls, and the local dump → restore → RLS rehearsal; see
`docs/evidence/2026-11-09_e2e-harness.md`. The latest Vercel production URL run returned 1 pass and
5 failures, including the duplicate header label; no live booking was confirmed, and the deployed
artifact is stale relative to this checkout. A restore of live pilot data has not been made:

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
   local artifact. Vercel has a configured production URL, but the deployed artifact is not passing
   the latest hosted browser checks; see issue #6.
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
| Hosted owner/employee/patron browser journeys | Local hermetic suite passes 6/6 twice; the deployed Vercel artifact still serves the pre-checkout build | Repository owner — approve publish of the reviewed artifact; engineering reruns the six journeys against it |
| Live booking confirmation journey | Booking passes in `verify:db` and in the hermetic browser journey; no live booking has been made against the deployed site | Repository owner — approve publish; engineering captures the live booking after all browser tests pass |
| Current source build/type-check | `npm run lint` and `npm run build` pass using `vite.pilot.config.ts`; root config is also static and no TanStack plugin is used | Engineering |
| Vercel production artifact | Project, production URL, and production variable names exist; deployed code is not verified against this checkout and fails hosted E2E | Repository owner — approve publish; engineering publishes and verifies the reviewed artifact |
| Pilot backup/restore rehearsal | Local dump → restore → RLS rehearsal passes with self-controls; a live dump/restore of pilot data has not been made | Repository owner — provide `SOURCE_DB_URL` and the production database password |
| Vercel commercial use | Project `stitchflow` is on the Hobby plan, which forbids commercial use | Repository owner — upgrade to Pro before a paid pilot |
| Regional availability | Single region `iad1`; no secondary region or failover configured | Repository owner — decide whether the pilot needs multi-region |
| Payment gateway credentials | Must live in a server-side secret store; no credentials provided | Repository owner |
| WhatsApp Business API sender and templates | Meta approval required | Atelier operator |
| Kenya/Nigeria data-protection review | Human legal/privacy decision | Repository owner |

## Sign-off rule

The release agent may not mark a gate DONE from narrative. Each row cites a file in
[`evidence/`](evidence/README.md) or a command that was run. Deployment and hosted-database claims
have a named human owner and are never reported as agent-verified.

## Milestone definition (2026-11-08)

- **Milestone 1 (target now):** one boutique atelier, supervised pilot, controlled staff/owner workflows; no guest self-booking, no payments, no media/trans actional communications yet.
- **Milestone 2 (public-ready):** any atelier/customer flow, including guest booking boundary, payments, transactional comms, SSR, monitoring, backups, and support operations.

### Highest-leverage Milestone 1 work
1. Link and configure the Vercel project, publish the correct artifact, and run smoke against current Supabase target.
2. Close tenant boundaries on writes and assert with regression tests.
3. Provision identities and run hosted owner/staff/patron workflows.
4. Lock the pilot support/rollback runbook.
5. Keep partner integrations (media, email/WhatsApp, payments) out of the pilot path.
