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

## Hosted pilot

| Script | Purpose |
|--------|---------|
| `ops/seed-pilot.mjs` | Create/refresh owner, employee, and patron identities plus an isolation-only second tenant and sample records. Refuses an implicit owner email, refuses targets other than the locally linked Supabase project, and writes credentials only to a gitignored `0600` `.env.pilot` |
| `ops/seed-pilot-fitting.mjs` | Link the deterministic pending fitting fixture to the pilot patron through the owner-scoped PostgREST boundary; uses the publishable key only |
| `ops/verify-pilot.mjs` | Sign in as pilot roles with the publishable key only and assert role visibility, own fitting visibility, cross-tenant denial, and fail-closed booking RPCs |

```bash
SUPABASE_PILOT_URL=... SUPABASE_PILOT_SERVICE_ROLE_KEY=... npm run seed:pilot
npm run seed:pilot-fitting # links the pilot's pending fitting to its patron
npm run verify:pilot        # reads .env.pilot; no service role
```

Set `PILOT_ADMIN_EMAIL` explicitly before seeding. Existing accounts are not reset unless the
matching saved password is already present in `.env.pilot`. Passwords are generated once, reused on
later runs, and never printed. A re-run converges on deterministic fixture rows. Atelier B exists
only as an isolation fixture; it is not part of the one-atelier supervised pilot.

## Rules

- A script that can pass while the real path is broken is a defect. Fix the script, not the claim.
- Never echo a credential. Redact as `***REDACTED***`.
- New scripts require a row in this file and, if they guard a release gate, a CI step.
