# Scripts

Operational scripts. Every script fails closed: a non-zero exit means the check did not pass.

## Database

| Script | Purpose |
|--------|---------|
| `verify-db.sh` | Apply migrations + seed + RLS suite + booking RPC suite + concurrency proof to a disposable Postgres |
| `db/booking_concurrency_test.sh` | 200 simultaneous hold attempts on one slot via `xargs -P 50`; asserts exactly one winner |
| `db/supabase-shim.sql` | Minimal `auth` schema and roles for plain Postgres |

```bash
npm run verify:db          # docker mode, disposable postgres:16
./scripts/verify-db.sh host # CI mode, uses PG* environment
```

The shim is never applied to a hosted Supabase project.

## CI guards

| Script | Purpose |
|--------|---------|
| `ci/check-doc-links.mjs` | Fail on a broken relative Markdown link |
| `ci/verify-build.mjs` | Assert the built bundle has no dev-only or placeholder artifacts |

```bash
npm run check:docs
npm run build && npm run verify:build
```

## Rules

- A script that can pass while the real path is broken is a defect. Fix the script, not the claim.
- Never echo a credential. Redact as `***REDACTED***`.
- New scripts require a row in this file and, if they guard a release gate, a CI step.
