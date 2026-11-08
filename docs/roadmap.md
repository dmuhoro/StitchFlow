# Roadmap

> Value-ordered plan. Aspirational items are never treated as shipped.

## v1.0.0 — Launch readiness (released, demo-first)

- Reproducible schema and seed.
- Proven tenant isolation (14 scenarios; gates 1–7 plus appointment insert boundaries).
- Bundled cultural imagery.
- Wired persistence with fail-closed configuration.
- CI, release, tag, clean tree, truthful docs.

`v1.0.0` is tagged and deployed as a **demo-first** product. The 2026-11-05 audit found two P0
defects, so it is not certified for a live atelier. See
[`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).

## Sprint 0a — Verify and Decide (done)

Audit and decisions only. ADR-008 through ADR-011 are **Proposed**. Sprint 1 is blocked until
ADR-008 and ADR-011 are approved.

## v1.1.0 — First pilot atelier (partially shipped)

Shipped: atomic owner onboarding (`create_atelier_with_owner`), invitation redemption, audit trail
for orders/measurements/settings/roles. Remaining:

- Remove demo code from the production artifact and make `verify:build` assert its absence.
- Tenant-correct order writes (`atelier_id` + `order_code`).
- Three-identity end-to-end verification against a hosted project.
- Media storage with signed URLs for garment photography.
- Email/WhatsApp transactional notifications.

## v1.2.0 — Booking engine, database layer (released)

Shipped:

- `booking_resources`, `resource_availability_rules`, `blackout_dates`, `bookings`,
  `idempotency_keys`.
- GiST exclusion constraint on live bookings per resource.
- `hold_slot`, `confirm_booking`, `cancel_booking`, `reschedule_booking` RPCs with tenant checks,
  availability/blackout validation, in-transaction expiry, and idempotent replay.
- 200-attempt / 50-concurrent exclusion proof wired into `npm run verify:db`.
- Audited booking transitions.

Remaining for the booking engine:

- Hosted verification of the owner UI and status-guard migration (implemented in the current
  working tree; local database verification is blocked by unavailable Docker/Postgres tooling).
- Guest edge-function boundary with per-IP/phone/tenant rate limits and a bot challenge. Until it
  exists, direct anonymous appointment inserts and the live visitor booking form are disabled.
- `booking_slots` and capacity greater than one.
- Scheduled expiry sweeper and its operational alert.

## v1.3.0 — Money and operations

- Quotes, invoices, deposits, and payment reconciliation (M-Pesa, card) under ADR-010.
- Fabric inventory and supplier records.
- QC, rework, delivery, and alteration history.
- Owner money-edit audit trail.
- Backups with a documented restore drill.

## v1.4.0 — Scale and trust

- Measurement version history and garment specification snapshots.
- Consent, retention, export, and deletion workflows.
- Monitoring, alerting, and an operations dashboard.
- Multi-atelier membership if pilot demand proves it.

## Explicit non-goals

Payments before the pilot; native mobile apps; a generic fashion-commerce catalog; replacing
African couture vocabulary with generic fields.

## Rule

An item enters "Now" only when its acceptance test exists and can be run.
