# Release Readiness

> The authoritative to-do list. A gate is DONE only with cited evidence.
> Last updated: 2026-11-08 (Vercel hosting decision and static deployment hardening).

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold: docs, ADRs, sprints, agents, scripts | DONE | `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain from empty database | DONE | `docs/evidence/2026-11-01_database_chain.md`, re-proven 2026-11-05 |
| L2 | RLS isolation suite green | DONE | 12 scenarios + structural assertions: `docs/evidence/2026-11-05_sprint-0-verification.md` |
| L3 | Local imagery bundled with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md`; scope limits in the Sprint 0 audit |
| L5 | CI runs lint, unit, browser smoke, build, docs, DB verification | DONE — browser smoke added in current checkpoint | `.github/workflows/ci.yml` |
| L6 | Release versioned, tagged, pushed | DONE | `docs/evidence/2026-11-01_release.md` (tag `v1.0.0`, remote ref verified) |
| L7 | Cleanup complete, lockfile committed, tree clean | DONE | `npm ci` succeeded on 2026-11-05; dead dependencies removed in `1bd06bb` |
| L8 | README, CHANGELOG, sprints updated | DONE | `CHANGELOG.md` 1.0.0/1.0.1, sprint records, evidence index |
| L9 | Deployment verified | **BLOCKED — owner Vercel setup and publish required** | Vercel static deployment config and production artifact gate are in source; no Vercel production project/deploy has been verified. Former Netlify bundle still embeds `vpathqzkaqdtbykumxeo`. |
| L10 | Production deploy fails closed on a demo-mode artifact | DONE — source + CI | `scripts/ci/verify-build.mjs` (`VERCEL_ENV=production`), `postbuild`, CI negative proof; `docs/evidence/2026-11-08_v1.4.0-rc.1.md` |
| L11 | Tenant-safe human-key writes and missing-atelier fail-closed guard | **PASS locally; hosted role/RLS proof PASS, hosted duplicate-code SQL not run** | `npm run test:unit`, `npm run verify:db` (including duplicate `order_code` across tenants), and `npm run verify:pilot` (30/30); hosted SQL fixture: `supabase/tests/hosted_rls_e2e.sql` |
| L12 | Owner/staff/patron hosted workflows | **PASS against fresh local artifact + hosted Supabase; live deployment pending** | `npm run verify:pilot` 30/30 and `STITCHFLOW_E2E_BASE_URL=http://127.0.0.1:4174 npm run test:e2e -- --workers=1 e2e/role-access.spec.ts` 3/3; default hosted cases require configured credentials |
| L13 | Pilot support, rollback, and backup/restore rehearsal | **Runbook added; restore rehearsal NOT DONE** | `docs/runbooks/pilot-operations.md`; owner must complete a disposable-project restore rehearsal before live non-synthetic data |
| L14 | Owner financial edits audited without exposing snapshots to staff/patrons | **PASS locally; production migration pending** | `20261108173000_audit_order_financials.sql`; `npm run verify:db` asserts actor/before/after capture, owner tenant scope, and staff/patron denial |

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
| B7 | Owner UI calls availability, hold, confirm, cancel, and resource setup | **PASS against fresh local artifact + hosted Supabase; live deploy pending** | `e2e/booking-confirm.spec.ts` passed using the deterministic pilot fitting fixture; run against live Vercel after publish |
| B8 | Guest rate limits and bot challenge | **CLOSED BY FAIL-CLOSED DISABLEMENT** | Anonymous appointment inserts and the live visitor booking form are disabled until the edge boundary is deployed |
| B9 | Client and staff cannot mint a confirmed appointment outside the booking RPCs | **DONE — local and hosted schema** | `20261107220000_restrict_client_appointment_insert.sql`; RLS tests 13–14, staff S7a–S7d; applied to production in rc.2 |
| B10 | Production migration history matches the tracked chain | **BLOCKED — current chain mismatch** | `CI=1 supabase migration list --remote` shows production at `20261107220000`; local `20261108173000_audit_order_financials.sql` is missing remotely; track in issue #5 |

## Production-readiness verdict

`v1.4.0-rc.2` is a **prerelease checkpoint**, not a certified production atelier system. The
Supabase-mode artifact gate rejects demo identities and retired/mismatched project refs. The booking
staff UI, insert boundary, fail-closed request guard, and new financial audit boundary pass local
database verification. Production schema parity was verified through `20261107220000`; the new
`20261108173000_audit_order_financials.sql` migration is not yet applied remotely. Tenant-safe
human-key writes pass unit and local database tests. Six hosted identities and a pilot fitting
fixture exist. A fresh static production build passes, the hosted publishable-key proof passes
30/30, owner/employee/patron browser journeys pass 3/3, and protected booking confirmation passes 1/1
against the fresh local bundle connected to hosted Supabase. The booking journey used the
script-owned synthetic fixture. The former Netlify artifact still targets a retired Supabase project.
Vercel is selected, but no production Vercel project or deployment has been verified; live-site
verification and backup/restore rehearsal remain incomplete:

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
   local artifact. Vercel still needs owner setup and publishing.
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
| Hosted Supabase schema parity / remote migration apply | Read-only `CI=1 supabase migration list --remote` verified production through `20261107220000`; `20261108173000_audit_order_financials.sql` is absent remotely. Tracked in issue #5. | Repository owner — review, apply, and verify `20261108173000_audit_order_financials.sql` |
| Hosted owner/employee/patron browser journeys | Pass 3/3 against fresh local artifact + hosted Supabase; live site remains unverified | Repository owner — publish Vercel; engineering reruns against live URL |
| Live booking confirmation journey | Pass 1/1 against fresh local artifact + hosted Supabase using synthetic pilot fixture; live site remains unverified | Repository owner — publish Vercel; engineering reruns if fixture reset |
| Current source build/type-check | `npm run lint` and `npm run build` pass using `vite.pilot.config.ts`; root config is also static and no TanStack plugin is used | Engineering |
| Vercel production artifact | **Not yet deployed** — `vercel.json` and production-mode artifact gate are checked in; project, environment, domain, and Auth redirect setup are owner-controlled | Repository owner — connect project, configure settings, publish |
| Pilot backup/restore rehearsal | Not performed; no verified backup/restore process | Repository owner — complete the disposable-project rehearsal in `docs/runbooks/pilot-operations.md` |
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
