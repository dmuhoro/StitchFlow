# Changelog

All notable changes to StitchFlow are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

