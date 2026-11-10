# Roadmap Brief

> Canonical: `docs/roadmap.md`.

## Now — Milestone 1: managed boutique-atelier pilot

The product code, local tenant checks, production schema, and pilot identities/fixtures exist.
Hosted RLS verification passes 30/30 and all three role journeys pass 3/3 against the fresh local
production bundle connected to hosted Supabase. Completion is blocked by the unverified hosted
deployment, missing owner approval to publish and run the live workflow, the unperformed
live-source backup/restore, and the corrected remote CI run. Do not call the pilot complete until
those gates pass.

Scope: one supervised atelier, controlled owner/staff/patron workflows, owner-provisioned accounts,
and explicit support/rollback procedures. A second hosted tenant is isolation-only test data.
Local browser/database/recovery gates pass. Hosted deployment, corrected remote CI, a live backup
restore, and the owner-approved hosted walkthrough are still open; do not claim pilot readiness.

## Later — v2: public-ready product

- Guest self-booking with rate limits and a bot challenge.
- Payments, deposits, invoices, and reconciliation (M-Pesa, card) under ADR-010.
- WhatsApp Business API and transactional email/SMS delivery.
- Media storage with signed URLs; SSR and public-launch metadata.
- Multi-atelier membership, tenant resolution by domain/slug, and broader customer flows.
- Fabric inventory, QC/rework, delivery and alteration history.
- Measurement versioning, consent/retention/export/deletion, and expanded monitoring.
- Multi-region failover and broad operational analytics.

Payments, SSR, guest booking, multi-region failover, and broad operational analytics are explicitly
deferred to v2 and are not prerequisites for the supervised single-atelier pilot.

## Explicitly out of scope for Milestone 1

- Multi-atelier membership per user.
- Payments, public guest booking, WhatsApp/SMS integrations, media storage, SSR, and public-launch hardening.
- Native mobile apps and generic fashion-commerce catalog features.

## Completion rule

A roadmap item moves to "Now" only when its acceptance test exists and can be run. Otherwise it is
aspirational and must be labelled as such.
