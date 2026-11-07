# Changelog

All notable changes to StitchFlow are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- GitHub Actions run URL is recorded in `docs/evidence/2026-11-07-booking-engine.md`.

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
