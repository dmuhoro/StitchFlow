# Decision Log Brief

> Canonical: `docs/adr/`. This is the index plus pre-ADR decisions.

## Formal ADRs

| ID | Decision | Status |
|----|----------|--------|
| [ADR-001](../../docs/adr/ADR-001-supabase-as-relational-backend.md) | Supabase Postgres + Auth + RLS is the backend | Accepted |
| [ADR-002](../../docs/adr/ADR-002-direct-uid-rls.md) | Direct `auth.uid()` policies with narrow `SECURITY DEFINER` predicates | Accepted |
| [ADR-003](../../docs/adr/ADR-003-seed-data-outside-migrations.md) | Seed data lives in `supabase/seed.sql`, not migrations | Accepted |
| [ADR-004](../../docs/adr/ADR-004-baseline-reconciliation.md) | Reconcile the legacy baseline with a guarded migration | Accepted |
| [ADR-005](../../docs/adr/ADR-005-fail-closed-data-mode.md) | `VITE_DATA_MODE` fails closed | Accepted |
| [ADR-006](../../docs/adr/ADR-006-vite-local-asset-imports.md) | Local imagery is imported through Vite | Accepted |
| [ADR-007](../../docs/adr/ADR-007-static-netlify-deployment.md) | Static SPA on Netlify with explicit env | Accepted |
| [ADR-008](../../docs/adr/ADR-008-single-tanstack-start-app.md) | One TanStack Start app: public SSR + authenticated app groups | **Proposed** |
| [ADR-009](../../docs/adr/ADR-009-booking-concurrency.md) | Booking exclusion constraints + expiring holds + idempotency | **Proposed** |
| [ADR-010](../../docs/adr/ADR-010-payments-and-ledger.md) | Append-only ledger + idempotent webhooks + derived balances | **Proposed** |
| [ADR-011](../../docs/adr/ADR-011-tenant-resolution.md) | Tenant by verified domain → subdomain → slug | **Proposed** |

ADR-008 and ADR-011 are hard gates before Sprint 1. None of the four is implemented.

## Pre-ADR decisions (historical)

| ID | Decision | Superseded by |
|----|----------|---------------|
| D1 | Browser-local demo data with namespaced `localStorage` | Kept for demo mode; ADR-005 |
| D2 | Role gates in the UI (`AccessGate`) | Cosmetic only; ADR-002 |
| D3 | Single `profiles` table | Renamed to `members`; ADR-004 |
| D4 | Money columns on `orders` | Split to `order_financials`; ADR-002/004 |
| D5 | Literal `/src/assets/...` image paths | ADR-006 |
| D6 | Demo PIN `1234` | Refused at runtime in Supabase mode, but still ships in the bundle — P0 `S0-P0-01`, Sprint 1 |
| D7 | Two seeded tenants (Nairobi KES, Lagos NGN) | ADR-003 |

## Rule

A change that contradicts an ADR must supersede it in the same commit with a new ADR that states
what it replaces and why. Silent divergence is not permitted.
