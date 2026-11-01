# Test Map

> Where each kind of proof lives. This repository does not use a JavaScript unit-test runner at
> v1.0.0; the security-critical proof is SQL against a real Postgres.

## Layers

| Layer | Location | Runner |
|-------|----------|--------|
| Tenant isolation / RLS | `supabase/tests/rls_isolation_test.sql` | `npm run verify:db` |
| Schema reproducibility | `supabase/migrations/` applied in order | `npm run verify:db` |
| Seed contract | `supabase/seed.sql` | `npm run verify:db` |
| Types | `src/**/*.ts(x)` | `npm run lint` (`tsc --noEmit`) |
| Build integrity | `dist/` | `npm run verify:build` |
| Documentation links | `**/*.md` | `npm run check:docs` |
| CI orchestration | `.github/workflows/ci.yml` | GitHub Actions |

## RLS suite scenarios

1. Owner cannot read another tenant's orders.
2. Owner cannot mutate another tenant's measurements.
3. Artisan sees assigned orders, no financials, and resolves names.
4. Patron sees own measurements, orders and balances; not another patron's.
5. Anonymous visitor sees published lookbook only.
6. Anonymous booking is limited to pending, account-less requests.
7. Owner cannot update another tenant's orders.
8. Cross-tenant insert is rejected by `WITH CHECK`.
9. Patron cannot escalate their own role.
10. Deactivated member loses access immediately.

## Adding a test

- SQL behavior → add a `DO $$ ... ASSERT ... $$` block to the RLS suite inside the existing
  transaction.
- Build behavior → add an assertion to `scripts/ci/verify-build.mjs`.
- Doc integrity → the link checker runs automatically.

## Rule

A test that passes without the fix is not proof. State the negative result in the evidence file.
