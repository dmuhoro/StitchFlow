# Sprint 03 — Booking Engine, Database Layer

**Status:** DONE — local and CI green; released as `v1.2.0`.
**Date:** 2026-11-07
**Branch:** `sprint-3/booking-engine-db` (from `main` at `098328d`), merged through PR #2.

## Planned

Implement the ADR-009 database layer without touching `appointments` or the frontend:

- Resource, availability, blackout, booking, and idempotency tables.
- A GiST exclusion constraint that makes a live double-booking impossible.
- `hold_slot`, `confirm_booking`, `cancel_booking`, and `reschedule_booking` RPCs with tenant checks,
  availability/blackout validation, in-transaction stale-hold expiry, and idempotent replay.
- A 200-attempt / 50-concurrent proof wired into `npm run verify:db`.
- RLS/RPC/adversarial tests, evidence, release metadata, and a pull request.

## Shipped

- `supabase/migrations/20261107120000_booking_engine.sql` — expand-only schema and RPCs.
- `supabase/tests/booking_engine_test.sql` — B1–B23.
- `scripts/db/booking_concurrency_test.sh` — 200 attempts, `xargs -P 50`.
- `scripts/verify-db.sh` — runs the booking suite and concurrency proof; asserts 16 public tables
  with RLS.
- Documentation: `docs/current-state.md`, `docs/architecture.md`, `docs/db-contracts.md`,
  `docs/security.md`, `docs/release-readiness.md`, `docs/roadmap.md`,
  `docs/adr/ADR-009-booking-concurrency.md`, `supabase/README.md`, `scripts/README.md`, root
  `README.md`, and `.ai/context/01_architecture.md` / `05_db-contracts.md`.
- Evidence: `docs/evidence/2026-11-07-booking-engine.md`.
- Release metadata: `package.json` `1.2.0`, `CHANGELOG.md`, this record.

## Proven

- `npm run verify:db` (disposable `postgres:16`):
  - 12 RLS scenarios PASS.
  - 15 hosted/local E2E scenarios PASS.
  - Booking suite B1–B23 PASS.
  - Concurrency: `attempts=200 success=1 slot_unavailable=199 other=0`, `live_rows=1 duplicates=0`.
  - `RLS enabled on every public table; 16 public tables present.`
- Catalog: 69 policies across 15 tables, 16 non-trigger `SECURITY DEFINER` functions, 1 exclusion
  constraint, 16/16 public tables with RLS.
- `npm run lint`, `npm run check:docs`, `npm run build`, `npm run verify:build`, `npm run audit`, and
  `npm run test:e2e -- --list` PASS locally.
- Exclusion constraint definition observed:
  `EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE status IN ('held','confirmed')`.
- GitHub Actions run [42371377892](https://github.com/dmuhoro/StitchFlow/actions/runs/42371377892)
  — both jobs PASS (`Types, docs and bundle`; `Migration chain and RLS`).

## Deliberate boundaries

- `appointments` and `appointments_public_insert` are unchanged. The legacy table still accepts
  overlapping rows; Gate 8 remains open for it (ADR-009 §8).
- No frontend calls the booking RPCs yet.
- `booking_resources.capacity` is constrained to `1`; `booking_slots` and group capacity are not
  implemented.
- No scheduled expiry sweeper; expiry runs inside booking transactions.
- Guest booking, rate limits, and a bot challenge are not implemented; `anon` is denied execute on
  every booking RPC.
- `idempotency_keys` retains the original hold token for replay; booking rows retain only its hash.
- ADR-009 stays **Proposed**. The implementation note records the shipped surface; it does not
  approve the decision.

## Remaining

- Frontend wiring of the four RPCs.
- Backfill/retire `appointments` (ADR-009 §8).
- Guest edge-function boundary with rate limits and a bot challenge.
- `booking_slots`, capacity greater than one, and a scheduled expiry sweeper.
- ADR-009 ratification by the repository owner (status is still **Proposed**).
