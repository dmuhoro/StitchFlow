# ADR-003 — Seed data lives outside migrations

**Status:** Accepted
**Date:** 2026-11-01

## Context

The original `002_seed_multi_tenant_data.sql` inserted ateliers, orders, measurements, and lookbook
rows as a migration. It was fragile: seed rows depend on `auth.users` records, and a schema
migration that also seeds cannot be applied cleanly to a production database that must start empty
or be seeded deliberately.

## Decision

Schema migrations contain DDL only. Seed data lives in `supabase/seed.sql` and is applied by
`supabase db reset` locally and by `scripts/verify-db.sh` in CI. The seed creates deterministic
`auth.users` identities and two tenants: Nairobi (KES) and Lagos (NGN).

## Consequences

- A production database can apply the schema without demo rows.
- The verification harness and local reset share one seed.
- Seed changes do not require a new migration version.
- Seed rows must satisfy every constraint, including currency checks. A constraint the seed violates
  is a schema defect, not a reason to weaken the seed.

## Alternatives considered

- **Seed in migration with `on conflict do nothing`:** still couples schema history to demo data and
  runs in production. Rejected.
- **No seed, tests build their own fixtures:** more isolation, but loses a realistic cultural dataset
  used by the demo and manual verification. Rejected for now.
