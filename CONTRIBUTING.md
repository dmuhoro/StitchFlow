# Contributing to StitchFlow

StitchFlow is a Pan-African atelier operating surface for bespoke tailoring. Contributions must keep
the cultural domain model intact and the tenant boundary proven.

## Before you start

1. Read [`AGENTS.md`](AGENTS.md) and [`docs/engineering/CONSTITUTION.md`](docs/engineering/CONSTITUTION.md).
2. Read [`docs/current-state.md`](docs/current-state.md) so you do not build on an aspirational claim.
3. Read [`docs/architecture.md`](docs/architecture.md) to find the real insertion point.

## Local workflow

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint         # tsc --noEmit
npm run build        # production bundle
npm run verify:db    # migration chain + RLS suite in a disposable Postgres
```

`npm run verify:db` requires Docker. It applies `supabase/migrations/*` in filename order to an empty
`postgres:16`, loads `supabase/seed.sql`, runs `supabase/tests/rls_isolation_test.sql`, and asserts
RLS is enabled on every public table.

## Change rules

- **One concern per commit.** Conventional prefix (`feat`, `fix`, `docs`, `test`, `chore`, `security`).
- **No weakened tests.** If a test fails, fix the code. Diagnostic tests must be marked and linked to
  an issue.
- **Tenant and money changes** require a `docs/db-contracts.md` update and a negative test that proves
  the boundary denies the attack.
- **Migrations are forward-only.** Never edit an applied migration; add an idempotent one.
- **Seed data** goes in `supabase/seed.sql`.
- **African couture labels** are contractual. Do not rename or genericize them.
- **Docs move with code.** Update the canonical doc and the `.ai/context` summary in the same commit.

## Pull request checklist

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run verify:db` passes when SQL or RLS changed.
- [ ] `npm run check:docs` passes.
- [ ] `CHANGELOG.md` and the relevant `sprints/` record are updated.
- [ ] No secret, real patron data, or live credential is present in the diff.
- [ ] `docs/current-state.md` still tells the truth.
