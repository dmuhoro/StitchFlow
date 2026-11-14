# Scripts

Operational scripts. Every script fails closed: a non-zero exit means the check did not pass.

## Database

| Script | Purpose |
|--------|---------|
| `verify-db.sh` | Apply migrations + seed + RLS suite + booking RPC suite + concurrency proof to a disposable Postgres |
| `db/booking_concurrency_test.sh` | 200 simultaneous hold attempts on one slot via `xargs -P 50`; asserts exactly one winner |
| `db/supabase-shim.sql` | Minimal `auth` schema and roles for plain Postgres |
| `ops/backup-restore-rehearsal.sh` | Dump a local or explicitly provided source, reject incomplete dumps, preserve source ACLs, restore to disposable PostgreSQL 16, compare all 16 public data-table row counts, then run the RLS suite on the restored DB |
| `ops/source-db.mjs` | Pass `SOURCE_DB_URL` to Docker as process environment for read-only `pg_dump` and row-count queries; never prints the URL |

```bash
npm run verify:db          # docker mode, disposable postgres:16
./scripts/verify-db.sh host # CI mode, uses PG* environment
npm run rehearse:restore  # local disposable dump → restore → RLS proof
```

The shim is never applied to a hosted Supabase project.

The local rehearsal is safe without hosted credentials. Live-source mode requires `SOURCE_DB_URL`
and only reads the source; the dump is restored into a separate disposable local container. A
supplied dump without a source URL cannot pass because it cannot be compared against source row
counts.

## Hermetic browser tests

| Script | Purpose |
|--------|---------|
| `e2e/hermetic.sh` | Start an isolated Supabase Auth + PostgREST stack on loopback, reset and seed it, build Supabase mode, then run Playwright |
| `e2e/seed-local.mjs` | Create per-run random Auth passwords and an invitation fixture; passwords are passed in memory, never logged or written |
| `ops/seed-pilot-fitting.mjs` | In hermetic mode, refuse all but the isolated E2E Supabase project and reset migrations/seed to recreate the pending fitting |
| `ci/negative-controls.sh` | Prove demo artifact deploy gate and demo browser journey fail as expected |

```bash
npm run test:e2e:hermetic # six journeys; requires Docker, Supabase CLI and Playwright Chromium
npm run verify:controls   # seven artifact/demo-mode negative controls
```

`.env.test` is a tracked, credential-free template for the loopback stack. The runner ignores
ambient hosted values, refuses non-loopback E2E configuration, and generates passwords per run.

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
