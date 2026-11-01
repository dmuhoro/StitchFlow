# 2026-11-01 — Database migration chain and RLS proof

## Command / Step

```bash
npm run verify:db
```

`scripts/verify-db.sh docker` starts a disposable `postgres:16`, applies
`scripts/db/supabase-shim.sql`, then every file in `supabase/migrations/` in filename order, loads
`supabase/seed.sql`, runs `supabase/tests/rls_isolation_test.sql`, and finishes with structural
assertions that RLS is enabled on every public table.

## Observed Result

```
==> supabase/migrations/001_initial_schema.sql
==> supabase/migrations/20261031110000_baseline_reconciliation.sql
==> supabase/migrations/20261031110500_security_hardening.sql
==> supabase/migrations/20261031111000_security_advisor_cleanup.sql
==> supabase/migrations/20261031111113_direct_uid_rls_preflight.sql
==> supabase/migrations/20261031111200_revoke_public_function_execute.sql
==> supabase/migrations/20261031111500_direct_uid_rls.sql
==> supabase/migrations/20261031112000_rls_final.sql
==> supabase/migrations/20261031113000_currency_alignment.sql
==> supabase/seed.sql
==> supabase/tests/rls_isolation_test.sql
NOTICE:  PASS [1] owner order isolation: own=3, leaked=0
NOTICE:  PASS [2] cross-tenant write isolation: rows mutated=0
NOTICE:  PASS [3] artisan scope: assigned=3, other=0, financials=0, members=4
NOTICE:  PASS [4] patron scope: measurements=1, orders=2, balances=2, clients=1, staff=2
NOTICE:  PASS [5] public perimeter: published=3, drafts=0, orders=0, members=0, ateliers=2
NOTICE:  PASS [6] anonymous booking: pending accepted, confirmed denied
NOTICE:  PASS [7] cross-tenant order update: rows mutated=0
NOTICE:  PASS [8] cross-tenant insert denied by WITH CHECK
NOTICE:  PASS [9] patron self role escalation blocked
NOTICE:  PASS [10] deactivated member access revoked: orders=0, measurements=0
==> structural assertions
==> database verification passed
```

Exit code `0`.

### Defects found and fixed by this run (negative results, recorded honestly)

1. **`order_financials.currency` rejected `NGN`.** The seed creates a Lagos tenant trading in NGN
   and the check constraint allowed only `KES`/`USD`, so the seed could not load.
   Fixed forward-only in `20261031113000_currency_alignment.sql` (no edit to an applied migration).
   The same migration pins `ateliers.default_currency` to `KES`/`USD`/`NGN`.
2. **Patron directory assertion was imprecise.** The scenario counted all `role = 'client'` rows,
   which necessarily includes the patron's own row. Replaced with an exact assertion:
   the patron sees exactly one client row (self) and zero rows for the other seeded patron, plus
   `staff >= 2` so name resolution is proven. This is stricter than the previous assertion.
3. **Test 10 used a superuser write to deactivate a member**, which the owner-only trigger correctly
   refused. Reworked so the seeded owner performs the deactivation (the real product path), then the
   deactivated artisan's own JWT is used to prove `orders = 0` and `measurements = 0`.

## Verdict

**PASS** — L1 (reproducible chain from empty) and L2 (RLS isolation, 10 scenarios + structural
assertions) are proven on a disposable Postgres.
