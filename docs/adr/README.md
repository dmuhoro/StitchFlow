# Architectural Decision Records

> Decisions that shape StitchFlow. Newest at the bottom. A change that contradicts an ADR must
> supersede it with a new ADR in the same commit.

| # | Title | Status |
|---|-------|--------|
| [001](ADR-001-supabase-as-relational-backend.md) | Supabase Postgres + Auth + RLS is the backend | Accepted |
| [002](ADR-002-direct-uid-rls.md) | Direct `auth.uid()` policies with narrow definer predicates | Accepted |
| [003](ADR-003-seed-data-outside-migrations.md) | Seed data lives outside migrations | Accepted |
| [004](ADR-004-baseline-reconciliation.md) | Reconcile the legacy baseline with a guarded migration | Accepted |
| [005](ADR-005-fail-closed-data-mode.md) | `VITE_DATA_MODE` fails closed | Accepted (runtime switch superseded by 008) |
| [006](ADR-006-vite-local-asset-imports.md) | Local imagery is imported through Vite | Accepted |
| [007](ADR-007-static-netlify-deployment.md) | Static SPA on Netlify with explicit environment | Accepted (provider superseded by 012) |
| [008](ADR-008-single-tanstack-start-app.md) | One TanStack Start app with public SSR and authenticated app groups | Approved — onboarding boundary linked |
| [009](ADR-009-booking-concurrency.md) | Booking concurrency: exclusion constraints plus expiring holds | Proposed — Sprint 3 |
| [010](ADR-010-payments-and-ledger.md) | Payments: append-only ledger, idempotent webhooks, derived balances | Proposed — Sprint 4 |
| [011](ADR-011-tenant-resolution.md) | Tenant resolution by verified domain, subdomain, then slug path | Approved — onboarding link only |
| [012](ADR-012-vercel-static-pilot-hosting.md) | Vercel static hosting for the supervised pilot | Accepted — supersedes ADR-007 provider choice |

## Conventions

- File name: `ADR-NNN-kebab-title.md`.
- Sections: Status, Context, Decision, Consequences, Alternatives considered.
- Immutable once Accepted. Supersede, do not rewrite.
