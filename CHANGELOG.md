# Changelog

All notable changes to StitchFlow are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Milestone 1 pilot hardening (in progress)

This is an untagged engineering checkpoint, not a production release. Local build and hosted backend
journeys pass; the managed pilot remains blocked on live Netlify publishing and backup/restore
rehearsal.

### Added

- Patron portal visibility for the authenticated patron's own fitting requests.
- Deterministic owner-provisioned pilot and fitting-fixture scripts, plus a pilot operations and
  backup/restore rehearsal runbook.
- Unit tests for fail-closed repository writes and tenant-scoped human-key mutations.

### Fixed

- Order-status, tailor-assignment, feedback-status, and invitation-revocation writes now require and
  include the resolved atelier in the database mutation boundary.
- Production artifact verification rejects retired or mismatched Supabase project references.

### Verification

- `npm run test:unit`, `npm run verify:db`, `npm run lint`, `npm run build`, and the production
  artifact assertions pass using the supported static pilot Vite config.
- Hosted publishable-key proof passed 30/30; owner, employee, and patron browser journeys passed
  3/3; protected booking confirmation passed 1/1 against the fresh local artifact and hosted
  Supabase. The live Netlify artifact still targets the retired project and publishing remains
  blocked on account credits. See
  `docs/evidence/2026-11-08_milestone-1-pilot-hardening.md`.

## [1.4.0-rc.2] — 2026-11-08

Hosted repair checkpoint. The connected production project now carries the complete tracked schema
and a matched migration history, and both the local and hosted database proofs pass. Hosted browser
role journeys remain blocked because production has no accounts yet; they require owner-provisioned
identities.

### Fixed

- Reconciled production migration history. Remote version `20261106122030`
  (`atomic_owner_onboarding`) is the same SQL as local
  `20261106160000_atomic_owner_onboarding.sql`; the live function body, execute grants, and absence
  of the retired `create_atelier_for_current_user` matched local. The history row was renamed to the
  canonical local version after that comparison.
- Applied the seven missing migrations to production: booking engine, booking staff slice, audit log,
  owner invitation permissions, appointment `source`, appointment/booking status guard, and the
  client appointment-insert boundary.
- Closed a deploy-gate blind spot: the production check validated the environment but not the
  project ref embedded in the artifact. A stale `dist/` built from the previous Supabase project
  (`vpathqzkaqdtbykumxeo`) passed the gate while the environment named `qkhfjlxhulekjrfgrdbz`. The
  gate now extracts the artifact's project ref and requires it to match `VITE_SUPABASE_URL` and the
  linked project; CI includes a negative proof for artifact/env drift.

### Verification

- `supabase db push --dry-run --remote` reports `upToDate: true`; `supabase migration list --remote`
  matches local and remote for every version.
- `STITCHFLOW_ALLOW_HOSTED_VERIFY=1 npm run verify:hosted` passed and left row counts unchanged.
- Hosted catalog now has 16 public tables, including `booking_resources`,
  `resource_availability_rules`, `blackout_dates`, `bookings`, and `idempotency_keys`, plus
  `hold_slot`, `confirm_booking`, `cancel_booking`, and `reschedule_booking`.
- Production has 0 auth users and 0 ateliers/members. Hosted owner/employee/patron browser journeys
  remain blocked on owner-provisioned identities.
- The corrected production artifact cannot be published: Netlify rejects new deploys with
  `403 Account credit usage exceeded - new deploys are blocked until credits are added`. The live
  site (`https://stitchflow-12pv.netlify.app`) still serves the earlier bundle, which embeds the
  retired project `vpathqzkaqdtbykumxeo`; that mismatch predates this checkpoint. Publishing is an
  owner billing action, not an engineering task.
- Evidence: `docs/evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md`.

## [1.4.0-rc.1] — 2026-11-08

First prerelease checkpoint for the live-data booking workflow. This release records the locally
verified integration work; it is **not approved for a production booking pilot** until the hosted
migration history is reconciled and hosted role journeys pass.

### Added

- Owner booking workspace for resource setup, availability, slot hold, confirmation, cancellation,
  and booking list refresh.
- Booking/request status synchronization and a database guard requiring a confirmed protected
  booking before a fitting request can be marked confirmed or completed.
- Patron appointment insertion is limited to the patron's own atelier and pending requests, with no
  staff assignment; owner/staff cannot use the patron insert policy.
- Opt-in hosted Playwright journeys for owner, employee, patron, and booking confirmation.
- Production deploy builds refuse demo mode or placeholder Supabase configuration, with a CI
  negative proof that a demo artifact is rejected.
- Evidence and release note: `docs/evidence/2026-11-08_v1.4.0-rc.1.md` and
  `docs/releases/RELEASE_1.4.0-rc.1_NOTES.md`.

### Changed

- Disabled unauthenticated live fitting requests until the rate-limited guest booking boundary is
  deployed.
- Format order terms using each order's currency and remove unsupported revenue growth claims.
- Scope the appointment update query by atelier.
- Updated booking, security, and pilot readiness documentation.

### Verification

- `npm run lint`, `npm run build`, Supabase-mode `verify:build`, `npm run check:docs`, and
  `npm run verify:db` passed locally. Full details and limitations are in
  `docs/evidence/2026-11-08_v1.4.0-rc.1.md`.
- Hosted SQL isolation verification passed, but hosted browser journeys were not run.
- Production is missing booking tables/RPCs and has unmatched remote migration
  `20261106122030`; no production migration was applied.

## [1.3.0] — 2026-11-07

Booking staff slice database layer verified and frontend types wired.

### Fixed

- Repaired broken `audit_log`, owner invitation permission, and availability migrations.
- Corrected hold_slot test argument ordering for task 2.

### Added

- Central re-export of booking domain types.
- Evidence record: `docs/evidence/2026-11-07-booking-staff-slice.md`.

## [1.2.0] — 2026-11-07

Booking-engine **database layer** only. No frontend change and no change to `appointments`.

### Added

- `supabase/migrations/20261107120000_booking_engine.sql` (expand-only):
  - `btree_gist` for the mixed GiST exclusion index.
  - `booking_resources`, `resource_availability_rules`, `blackout_dates`, `bookings`, and
    `idempotency_keys`, all with tenant-scoped RLS.
  - `bookings_no_overlap`:
    `EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE status IN ('held', 'confirmed')`.
  - `hold_slot`, `confirm_booking`, `cancel_booking`, and `reschedule_booking` as `SECURITY DEFINER`
    RPCs with `SET search_path = ''`, in-function tenant checks, availability/blackout validation,
    in-transaction stale-hold expiry, and idempotent replay.
  - Internal `expire_stale_holds` and `booking_window_error` helpers; no client grant.
  - Audit trigger on booking inserts, updates, and deletes.
- `supabase/tests/booking_engine_test.sql`: B1–B23 covering RLS perimeter, cross-tenant denial,
  role limits, availability, blackouts, expiry, confirm/cancel/reschedule, and idempotency.
- `scripts/db/booking_concurrency_test.sh`: 200 simultaneous attempts, `xargs -P 50`, exactly one
  winner, 199 `slot_unavailable`, zero duplicates.
- `scripts/verify-db.sh` now runs the booking RPC suite and the concurrency proof and asserts 16
  public tables with RLS.
- Evidence: `docs/evidence/2026-11-07-booking-engine.md`. Sprint record:
  `sprints/sprint-03-booking-engine-db.md`.

### Changed

- Version bump to `1.2.0`.
- `docs/current-state.md`, `docs/architecture.md`, `docs/db-contracts.md`, `docs/security.md`,
  `docs/release-readiness.md`, `docs/roadmap.md`, `docs/adr/ADR-009-booking-concurrency.md`,
  `supabase/README.md`, `scripts/README.md`, the root `README.md`, and the `.ai/context` briefs now
  distinguish the protected `bookings` store from the still-unguarded legacy `appointments` table.
- `CHANGELOG.md` structure repaired: the document header is back at the top and the two duplicate
  `1.0.1` blocks are merged into one section. Historical entries are preserved.

### Verified

- `npm run lint` — PASS.
- `npm run check:docs` — PASS.
- `npm run build` — PASS.
- `npm run verify:build` — PASS.
- `npm run audit` — PASS (0 vulnerabilities).
- `npm run test:e2e -- --list` — PASS (1 test collected).
- `npm run verify:db` — PASS: 12 RLS scenarios, 15 E2E scenarios, booking suite B1–B23,
  `attempts=200 success=1 slot_unavailable=199 other=0`, `live_rows=1 duplicates=0`, 16 public
  tables with RLS.
- GitHub Actions run [42371377892](https://github.com/dmuhoro/StitchFlow/actions/runs/42371377892)
  — both jobs PASS. Run URL also recorded in `docs/evidence/2026-11-07-booking-engine.md`.

### Known limitations

- The legacy `appointments` table is unchanged. It still accepts overlapping rows and anonymous
  pending inserts; `appointments_public_insert` is retained. Gate 8 remains open for it
  (ADR-009 §8).
- The frontend does not call any booking RPC yet; the live UI still uses the legacy path.
- `booking_resources.capacity` is constrained to `1`. `booking_slots` and group capacity are not
  implemented.
- No scheduled hold-expiry sweeper. Expiry runs only inside booking transactions.
- Guest booking, per-IP/phone/tenant rate limits, and a bot challenge are not implemented.
  Anonymous callers are denied execute on every booking RPC.
- `idempotency_keys` retains the original hold token for replay; booking rows retain only its hash.

## [1.1.0] — 2026-11-06

### Added

- Production-only guard logic for atelier resolution, feedback, lookbook, and order creation.
- Explicit "Create Atelier" onboarding screen and invite-code redemption route.
- Real-tenant-based behaviour with fail-closed HTTP and datastore guards.
- Refactored data-mode aliasing and demo-tenants config.
- Updated `AtelierLanding`, `TeamInvitesPanel`, and `AcceptInvitationScreen`.
- `scripts/verify-hosted.sh` and enhanced hosted DB verification.
- Atomic `create_atelier_with_owner` onboarding RPC; the legacy callable is removed.
- Playwright invitation acceptance coverage with a server-confirmed membership-role assertion.
- Evidence `docs/evidence/2026-11-06_sprint-1-verification.md`; updated current state.

### Changed

- Version bump to 1.1.0.
- Updated RLS and audit logs.
- Consolidated migration plan.

### Verified

- `npm run lint`, `npm run build`, `npm run verify:build`, and Playwright test collection pass
  locally.
- The connected Supabase project contains `create_atelier_with_owner`; full hosted SQL execution
  still requires the deliberate `STITCHFLOW_ALLOW_HOSTED_VERIFY=1` CLI gate.

### Known limitations

- `npm run verify:db` could not run in that sandbox because Docker was unavailable; CI remains the
  disposable-Postgres proof environment.
- The live Playwright flow requires an invited test account and code supplied through environment
  variables.

## [1.0.1] — 2026-11-05

Audit and hardening patch. No feature UI change in the audit half.

### Added

- Dedicated StitchFlow Supabase project (`qkhfjlxhulekjrfgrdbz`) with forward-only migration push.
- `audit_log` plus triggers on orders and measurements.
- `invitations` ledger plus `lookup_invitation`/`accept_invitation` RPC.
- Explicit "Create Atelier" onboarding screen and invite redemption route.
- Sprint 0 audit: `docs/audit/2026-11-05_sprint-0-audit.md` with a prioritized P0–P3 defect list,
  the eight-gate verdict, and the owner-blocked work list.
- Proposed ADR-008 (TanStack Start SSR shell), ADR-009 (booking concurrency), ADR-010 (payments
  ledger), and ADR-011 (tenant resolution). All remain **Proposed**, not Accepted.
- RLS scenarios 11 (patron write denial) and 12 (tenant-id mutation guards); expanded scenario 3
  (other-tenant measurements) and scenario 4 (patron appointments). Suite is now 12 scenarios.
- Evidence record and index entry: `docs/evidence/2026-11-05_sprint-0-verification.md`.
- Sprint record `sprints/sprint-00a-verify-and-decide.md`.

### Changed

- Build/dev adapters split demo-only seed data from production builds
  (`src/data/initialData.demo.ts` / `.production.ts`).
- Production `verify:build` asserts absence of demo PII and artifacts.
- `docs/current-state.md`, `docs/architecture.md`, `docs/db-contracts.md`, `docs/roadmap.md`,
  `docs/release-readiness.md`, `supabase/README.md`, and the `.ai/context` briefs now state the
  verified result instead of the prior narrative.
- Release readiness distinguishes "deployed" from "artifact clean"; L9 is deploy-only evidence.

### Removed

- Unused dependencies: `express`, `@types/express`, `dotenv`, `@google/genai`, `autoprefixer`,
  `esbuild`, `motion`, `tsx`.
- Stale `bun.lock`; npm with `package-lock.json` is the single package-manager contract.
- Stale AI Studio environment entries from `.env.example`.
- The false `create_atelier_for_current_user(...)` contract row; the function is dropped and absent.

### Known defects recorded, not fixed

- `S0-P0-01` demo identities, PIN `1234`, credential cards, and demo slugs still ship in the
  Supabase-mode bundle while `verify:build` passes.
- `S0-P0-02` overlapping appointments are accepted; no exclusion constraint exists (gate 8 FAIL).
- `S0-P1-03` no owner/employee `INSERT` policy on `appointments`.

## [1.0.0] — 2026-11-01

### Added

- Operating scaffold: `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.ai/context` briefs, agent role
  briefs, `docs/engineering/CONSTITUTION.md`, ADRs 001–007, evidence log, release notes, runbooks,
  sprint records, and a test map.
- `scripts/ci/check-doc-links.mjs` and `scripts/ci/verify-build.mjs` quality guards.
- `npm run check:docs`, `npm run verify:build`, `npm run verify:db`, and `npm run verify:db:host`.
- `20261031110000_baseline_reconciliation.sql` and `20261031112000_rls_final.sql` so the tracked
  chain rebuilds the schema the client queries and proves tenant isolation.
- `supabase/seed.sql` with two pilot tenants (Nairobi KES, Lagos NGN), separated from migrations.
- `scripts/verify-db.sh` and `scripts/db/supabase-shim.sql` for disposable Postgres verification.
- Persistence for feedback resolution, lookbook publishing, and atelier settings.
- Public read path for the published lookbook and atelier profile in Supabase mode.
- `.github/workflows/ci.yml` with a quality job (types, docs links, both build modes, artifact
  assertions) and a database job (migration chain + RLS suite on a Postgres service container).

### Changed

- Local couture imagery is imported through Vite and emitted with hashed URLs.
- Currency mapping preserves `NGN`; Sokoto inseam and Buba chest survive the measurement round trip.
- Anonymous fitting requests persist with `client_id = null` and the guest's name and phone.

### Fixed

- `order_financials.currency` now accepts `NGN` via a forward-only migration.
- Production builds no longer reference `/src/assets/...` paths that 404 after bundling.
- Demo role sign-in, demo PIN, tenant switching, and destructive reset are refused in
  `VITE_DATA_MODE=supabase` at the action boundary.
- Supabase mode no longer seeds demo orders, measurements, appointments, feedback, or lookbook.
