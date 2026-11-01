# Runbook: Local Database Verification

> Reproduce the StitchFlow schema and prove tenant isolation without a hosted Supabase project.

## What it does

`scripts/verify-db.sh` starts a disposable `postgres:16` container, installs a minimal Supabase
shim (the `auth` schema, `auth.uid()`, and the `anon`/`authenticated`/`service_role` roles), applies
every file in `supabase/migrations/` in filename order, loads `supabase/seed.sql`, runs
`supabase/tests/rls_isolation_test.sql`, and asserts RLS is enabled on every public table. Any SQL
error or failed assertion exits non-zero.

## Prerequisites

- Docker running.
- An image for `postgres:16` available locally or pullable.

## Run

```bash
npm run verify:db
```

Expected tail:

```
==> supabase/tests/rls_isolation_test.sql
NOTICE:  PASS [1] owner order isolation ...
...
==> structural assertions
==> database verification passed
```

## CI mode

In GitHub Actions the same chain runs against a `postgres:16` service container:

```bash
./scripts/verify-db.sh host
```

with `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` set by the workflow.

## Why a shim exists

A plain Postgres has no `auth` schema or Supabase roles. The shim provides exactly what the
migrations and RLS suite require, and nothing else. It is never applied to a hosted project.

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `connection ... shutting down` | Entrypoint still initialising | The script retries a real query; wait for readiness |
| `violates check constraint` on seed | Seed value outside the schema contract | Fix the schema migration or the seed, never the assertion |
| RLS suite assertion | Policy regression | Fix the policy and add/adjust the scenario |
| `role "authenticated" does not exist` | Shim not applied | Ensure `scripts/db/supabase-shim.sql` runs first |

## Hosted project

This runbook does not touch a hosted project. Applying migrations remotely requires owner
authorization and `supabase link`; see [`deployment.md`](deployment.md).
