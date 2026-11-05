# Roadmap Brief

> Canonical: `docs/roadmap.md`.

## Now — Sprint 0a done, Sprint 1 blocked

`v1.0.0` is a released demo-first product, not a certified production atelier system. The
2026-11-05 audit passes gates 1–7 and fails gate 8. Two P0 defects are open.

Sprint 1 may not start until the owner approves ADR-008 (SSR shell) and ADR-011 (tenant resolution).

## v1.1.0 — First pilot atelier

- Remove demo code from the production artifact; make the artifact gate assert absence.
- Atomic onboarding RPC; tenant-correct order writes (`atelier_id` + `order_code`).
- Audit trail for orders, measurements, settings and role changes.
- Owner/employee appointment creation and booking concurrency (ADR-009).
- Invite staff; publish the first lookbook.
- Three-identity end-to-end test against a hosted project.
- Media storage with signed URLs.
- Email/WhatsApp transactional notifications.
- Anonymous booking rate limiting.

## Later — business surface

- Quotes, invoices, deposits, and payment reconciliation (M-Pesa, card) under ADR-010.
- Fabric inventory, QC/rework, delivery and alteration history.
- Measurement versioning and garment specification snapshots.
- Consent, retention, export and deletion workflows.
- Backups with a restore drill, and operational monitoring/alerting.

## Explicitly out of scope for v1.0.0

- Payments.
- Multi-atelier membership per user.
- Native mobile apps.
- Generic fashion-commerce catalog features.

## Completion rule

A roadmap item moves to "Now" only when its acceptance test exists and can be run. Otherwise it is
aspirational and must be labelled as such.
