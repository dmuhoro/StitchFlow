# Release Readiness

> The authoritative to-do list. A gate is DONE only with cited evidence.
> Last updated: 2026-11-08 (v1.4.0-rc.1 booking integration checkpoint).

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold: docs, ADRs, sprints, agents, scripts | DONE | `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain from empty database | DONE | `docs/evidence/2026-11-01_database_chain.md`, re-proven 2026-11-05 |
| L2 | RLS isolation suite green | DONE | 12 scenarios + structural assertions: `docs/evidence/2026-11-05_sprint-0-verification.md` |
| L3 | Local imagery bundled with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md`; scope limits in the Sprint 0 audit |
| L5 | CI runs lint, build, docs, DB verification | DONE | `docs/evidence/2026-11-01_ci.md` |
| L6 | Release versioned, tagged, pushed | DONE | `docs/evidence/2026-11-01_release.md` (tag `v1.0.0`, remote ref verified) |
| L7 | Cleanup complete, lockfile committed, tree clean | DONE | `npm ci` succeeded on 2026-11-05; dead dependencies removed in `1bd06bb` |
| L8 | README, CHANGELOG, sprints updated | DONE | `CHANGELOG.md` 1.0.0/1.0.1, sprint records, evidence index |
| L9 | Deployment verified | DONE (deploy only) | `docs/evidence/2026-11-01_deployment.md` — live, but the artifact contains demo code (P0 below) |
| L10 | Production deploy fails closed on a demo-mode artifact | DONE — source + CI | `scripts/ci/verify-build.mjs` (`CONTEXT=production`), `postbuild`, CI negative step; `docs/evidence/2026-11-08_v1.4.0-rc.1.md` |

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
| B6 | Confirmed fitting must have a protected resource booking | **LOCAL PASS — hosted migration pending** | New status guard and booking/request sync migration; `npm run verify:db` |
| B7 | Owner UI calls availability, hold, confirm, cancel, and resource setup | **LOCAL PASS — hosted flow pending** | `src/components/BookingWorkspace.tsx`, `src/lib/atelier-booking-repository.ts`; opt-in Playwright test added |
| B8 | Guest rate limits and bot challenge | **CLOSED BY FAIL-CLOSED DISABLEMENT** | Anonymous appointment inserts and the live visitor booking form are disabled until the edge boundary is deployed |
| B9 | Client and staff cannot mint a confirmed appointment outside the booking RPCs | **LOCAL PASS** | `20261107220000_restrict_client_appointment_insert.sql`; RLS tests 13–14, staff S7a–S7d |

## Production-readiness verdict

`v1.4.0-rc.1` is a **prerelease checkpoint**, not a certified production atelier system. The
Supabase-mode bundle excludes demo code, and the deploy boundary now fails closed. The booking staff
UI, the insert boundary, and the fail-closed request guard pass local database verification. Hosted
schema parity and hosted browser flows remain unproven. Production is missing the booking migrations
and has an unmatched remote migration; local migration proof passes, but production
migration-history reconciliation and hosted role fixtures remain release blockers:

1. `S0-P0-01` — **closed in source and at the deploy boundary**. Supabase-mode build and
   `verify:build` reject demo identities, PIN, credential cards, tenant slugs, and demo lookbook
   copy. `postbuild` runs the assertion on every build, and a Netlify `CONTEXT=production` deploy
   fails unless `VITE_DATA_MODE=supabase` with real Supabase values. CI proves the gate rejects a
   demo artifact. Evidence: `docs/evidence/2026-11-08_v1.4.0-rc.1.md`.
2. `S0-P0-02` — **code changed, local DB proof PASS; hosted proof pending**. The new migration guards
   confirmation against the protected booking store and disables anonymous direct inserts. The
   update-only guard was still bypassable by a client `INSERT`; migration
   `20261107220000_restrict_client_appointment_insert.sql` now limits a client to an own-tenant
   `pending` request with no assigned tailor. The owner UI uses
   `hold_slot`/`confirm_booking`/`cancel_booking`. Production is missing these migrations and has an
   unmatched remote migration version, so no push was attempted.

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
| Hosted Supabase schema parity / remote migration apply | Remote has unmatched migration `20261106122030`; booking tables/RPCs absent. Reconcile the migration against the live schema before any push. | Repository owner |
| Netlify deployment and custom-domain DNS | Not re-verified in this environment | Repository owner |
| Hosted role-based and booking browser journeys | Requires owner-provisioned owner, employee, patron credentials and a unique pending booking fixture | Repository owner |
| Payment gateway credentials | Must live in a server-side secret store; no credentials provided | Repository owner |
| WhatsApp Business API sender and templates | Meta approval required | Atelier operator |
| Kenya/Nigeria data-protection review | Human legal/privacy decision | Repository owner |
| ADR-008 and ADR-011 approval | Architecture and tenant-boundary decision | Repository owner |

## Sign-off rule

The release agent may not mark a gate DONE from narrative. Each row cites a file in
[`evidence/`](evidence/README.md) or a command that was run. Deployment and hosted-database claims
have a named human owner and are never reported as agent-verified.
