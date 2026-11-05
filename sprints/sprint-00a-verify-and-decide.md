# Sprint 00a — Verify and Decide

**Status:** DONE (audit). Next sprint is BLOCKED on owner approval.
**Date:** 2026-11-05
**Baseline:** `d06262a`

## Objective

Audit the repository against its own constitution and eight verification gates, prove what actually
works on a disposable database, write the decisions needed before new feature code, and stop. This
sprint writes **no feature code**.

## Shipped

| Commit | Concern |
|--------|---------|
| `1bd06bb` | `chore(deps): remove unused runtime and build dependencies` |
| `defd4f1` | `test(rls): prove patron write denial and tenant-id mutation guards` |
| `d06262a` | `docs(adr): propose SSR, booking, ledger and tenant-resolution decisions` |
| _this commit_ | `docs: publish Sprint 0 audit, evidence and canonical state` |

## Proven

- `npm ci`, `npm run lint`, `npm run check:docs`, `npm run build`, `npm run verify:build`,
  `npm run verify:db` and `npm audit --audit-level=high` are green.
- The RLS suite now has **12 adversarial scenarios**; gates 1–7 PASS.
- Catalog facts on a disposable `postgres:16`: 9 tables with RLS, 52 policies, 8 `SECURITY DEFINER`
  functions, 0 exclusion constraints, 0 audit/ledger/webhook tables, 0 onboarding RPC.
- Gate 8 is **FAIL**: two overlapping appointments for the same tailor and instant are accepted;
  no owner/employee `INSERT` policy exists on `appointments`.
- The Supabase-mode production bundle contains `Demo PIN: 1234`, demo identities, credential cards
  and demo tenant slugs, while `verify:build` still exits `0`. This is a P0 false-confidence gate.

Evidence: [`docs/evidence/2026-11-05_sprint-0-verification.md`](../docs/evidence/2026-11-05_sprint-0-verification.md).
Findings: [`docs/audit/2026-11-05_sprint-0-audit.md`](../docs/audit/2026-11-05_sprint-0-audit.md).

## Decisions proposed

| ADR | Decision | Status |
|-----|----------|--------|
| [ADR-008](../docs/adr/ADR-008-single-tanstack-start-app.md) | One TanStack Start app: public SSR group + authenticated app group | Proposed |
| [ADR-009](../docs/adr/ADR-009-booking-concurrency.md) | Exclusion constraints + expiring holds + idempotency | Proposed |
| [ADR-010](../docs/adr/ADR-010-payments-and-ledger.md) | Append-only ledger + idempotent webhooks + derived balances | Proposed |
| [ADR-011](../docs/adr/ADR-011-tenant-resolution.md) | Verified domain → subdomain → slug resolution | Proposed |

## Not done — intentionally

- No Sprint 1+ feature code.
- No schema migration, no new table, no RLS policy change to close gate 8 or the staff-insert gap.
- No demo-code removal and no new failing artifact assertion, because either would turn `main` red
  before Sprint 1 implements the fix. The defect is recorded, not hidden.
- No hosted Supabase, Netlify, DNS, payment or WhatsApp verification.

## Blockers and owners

| Blocker | Owner |
|---------|-------|
| Approve ADR-008 and ADR-011 before Sprint 1 | Repository owner |
| Confirm SSR-capable host and demo subdomain | Repository owner |
| Hosted Supabase access through host environment only | Repository owner |
| Legal/privacy review for Kenya and Nigeria | Repository owner |
| Payment and WhatsApp credentials in server secret store | Repository owner / atelier operator |

## Next sprint entry criteria

Sprint 1 may start only after ADR-008 and ADR-011 are approved, and must close `S0-P0-01`,
`S0-P1-02`, `S0-P1-04`, `S0-P1-07`, `S0-P1-10` and `S0-P1-11`.
