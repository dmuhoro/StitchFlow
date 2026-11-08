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

## Milestone 1 — Managed single-atelier pilot (in progress)

Shipped locally: atomic owner onboarding (`create_atelier_with_owner`), invitation redemption,
audit trail for orders/measurements/settings/roles, production artifact gate, tenant-scoped
repository writes, hosted identity fixtures, and the controlled owner/staff/patron browser journeys
against the fresh static build and hosted Supabase.

- Owner must restore Netlify deploy credits and publish the current artifact; the live site still
  targets the retired Supabase project.
- Run live-site role and booking-confirmation verification after the publish. Do not mark the pilot
  complete before this check passes.
- Complete and record a disposable-project backup/restore rehearsal before non-synthetic atelier
  data is accepted.
- Partner integrations remain out of Milestone 1: media storage signed URLs, transactional
  email/WhatsApp, payments, guest edge-function, capacity > one booking.

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

- Live-Netlify verification of the owner UI and status-guard migration. Local database and
  hosted-schema checks pass; role UI checks pass against the fresh local build.
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

## Milestone 2 — Public-ready product (later)

Guest booking with a rate-limited edge boundary, payments, transactional communications, public
tenant resolution/SSR, media storage, multi-atelier support, broader operational monitoring, and
public launch hardening remain future scope. These are not prerequisites to finishing the
supervised pilot.

## Explicit non-goals

Payments before the pilot; native mobile apps; a generic fashion-commerce catalog; replacing
African couture vocabulary with generic fields.

## Rule

An item enters "Now" only when its acceptance test exists and can be run.
