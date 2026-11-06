## [1.1.0] — 2026-11-06

### Added
- Production-only guard logic for atelier resolution, feedback, lookbook, order creation.
- Explicit "Create Atelier" onboarding screen and invite‑code redemption route.
- Real‑tenant based behaviour with fail‑closed HTTP and datastore guards.
- Refactored data‑mode aliasing and demo‑tenants config.
- Updated `AtelierLanding`, `TeamInvitesPanel`, `AcceptInvitationScreen`.
- Added `scripts/verify-hosted.sh` and enhanced hosted DB verification.
- New docs: evidence/2026-11-06_sprint-1-verification.md, updated current‑state.

### Changed
- Version bump to 1.1.0.
- Updated RLS and audit logs.
- Consolidated migration plan.

### Verified
- `npm run lint`, `npm run build`, `npm run verify:db`, `npm run verify:hosted`, `npm run verify:build` green.

### Known defects
- None.

---

## [1.0.1] — 2026-11-05
### Added
- Dedicated StitchFlow Supabase project (`qkhfjlxhulekjrfgrdbz`) with forward-only migration push.
- `audit_log` plus triggers on orders and measurements.
- `invitations` ledger plus `lookup_invitation`/`accept_invitation` RPC.
- Explicit “Create Atelier” onboarding screen + invite redemption route.
### Changed
- Build/dev adapters split demo-only seed data from production builds (`src/data/initialData.demo.ts` / `.production.ts`).
- `verify:build` production mode now asserts absence of demo PII/artifacts.
### Verified
- lint/build/db/verify-build green on local disposable DB.

# Changelog

All notable changes to StitchFlow are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] — 2026-11-05

Audit-only patch. No feature code and no schema change.

### Added

- Sprint 0 audit: `docs/audit/2026-11-05_sprint-0-audit.md` with a prioritized P0–P3 defect list,
  the eight-gate verdict, and the owner-blocked work list.
- Proposed ADR-008 (TanStack Start SSR shell), ADR-009 (booking concurrency), ADR-010 (payments
  ledger), and ADR-011 (tenant resolution). All remain **Proposed**, not Accepted.
- RLS scenarios 11 (patron write denial) and 12 (tenant-id mutation guards); expanded scenario 3
  (other-tenant measurements) and scenario 4 (patron appointments). Suite is now 12 scenarios.
- Evidence record and index entry: `docs/evidence/2026-11-05_sprint-0-verification.md`.
- Sprint record `sprints/sprint-00a-verify-and-decide.md`.

### Changed

- `docs/current-state.md`, `docs/architecture.md`, `docs/db-contracts.md`, `docs/roadmap.md`,
  `docs/release-readiness.md`, `supabase/README.md` and the `.ai/context` briefs now state the
  verified result instead of the prior narrative.
- Release readiness distinguishes "deployed" from "artifact clean"; L9 is deploy-only evidence.

### Removed

- Unused dependencies: `express`, `@types/express`, `dotenv`, `@google/genai`, `autoprefixer`,
  `esbuild`, `motion`, `tsx`.
- Stale `bun.lock`; npm with `package-lock.json` is the single package manager contract.
- Stale AI Studio environment entries from `.env.example`.
- The false `create_atelier_for_current_user(...)` contract row; the function is dropped and absent.

### Known defects recorded, not fixed

- `S0-P0-01` demo identities, PIN `1234`, credential cards and demo slugs still ship in the
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

