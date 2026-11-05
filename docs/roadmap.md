# Roadmap

> Value-ordered plan. Aspirational items are never treated as shipped.

## v1.0.0 — Launch readiness (released, demo-first)

- Reproducible schema and seed.
- Proven tenant isolation (12 scenarios; gates 1–7).
- Bundled cultural imagery.
- Wired persistence with fail-closed configuration.
- CI, release, tag, clean tree, truthful docs.

`v1.0.0` is tagged and deployed as a **demo-first** product. The 2026-11-05 audit found two P0
defects, so it is not certified for a live atelier. See
[`audit/2026-11-05_sprint-0-audit.md`](audit/2026-11-05_sprint-0-audit.md).

## Sprint 0a — Verify and Decide (done)

Audit and decisions only. ADR-008 through ADR-011 are **Proposed**. Sprint 1 is blocked until
ADR-008 and ADR-011 are approved.

## v1.1.0 — First pilot atelier (blocked on ADR approval)

- Remove demo code from the production artifact and make `verify:build` assert its absence.
- Atomic owner onboarding with a real onboarding RPC.
- Tenant-correct order writes (`atelier_id` + `order_code`).
- Audit trail for orders, measurements, settings and role changes.
- Owner/employee appointment creation and server-side booking concurrency (ADR-009).
- Owner onboarding: invite staff, publish first lookbook.
- Three-identity end-to-end verification against a hosted project.
- Media storage with signed URLs for garment photography.
- Email/WhatsApp transactional notifications.
- Anonymous booking rate limiting.

## v1.2.0 — Money and operations

- Quotes, invoices, deposits, and payment reconciliation (M-Pesa, card) under ADR-010.
- Fabric inventory and supplier records.
- QC, rework, delivery, and alteration history.
- Owner money-edit audit trail.
- Backups with a documented restore drill.

## v1.3.0 — Scale and trust

- Measurement version history and garment specification snapshots.
- Consent, retention, export, and deletion workflows.
- Monitoring, alerting, and an operations dashboard.
- Multi-atelier membership if pilot demand proves it.

## Explicit non-goals

Payments before the pilot; native mobile apps; a generic fashion-commerce catalog; replacing
African couture vocabulary with generic fields.

## Rule

An item enters "Now" only when its acceptance test exists and can be run.
