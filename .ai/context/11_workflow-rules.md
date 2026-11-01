# Workflow Rules Brief

> Canonical: [`docs/engineering/CONSTITUTION.md`](../../docs/engineering/CONSTITUTION.md) and root
> [`AGENTS.md`](../../AGENTS.md). This file condenses them.

## Hard rules

1. Read `docs/current-state.md` and `docs/architecture.md` before acting. Stop if a task assumes an
   aspirational capability.
2. Never weaken a test to pass a build.
3. Tenant and money changes require a `docs/db-contracts.md` update and a negative test.
4. Enforcement goes at the real boundary; cite `file:line` before claiming a guard.
5. Fail closed. No silent degradation of a write.
6. No secret in a commit, log, fixture, or evidence file.
7. Preserve African couture structures and measurement labels.
8. Migrations are forward-only; seed lives in `supabase/seed.sql`.
9. Every release gets a version bump, changelog, sprint record, and annotated tag.
10. Docs move with code in the same commit.
11. One concern per commit; explicit conventional message; green tree.

## Execution rhythm

- Work in layers. Finish one layer (code + tests + docs) before the next.
- Commit each layer individually.
- Run `npm run lint`, `npm run build`, `npm run check:docs`, and `npm run verify:db` when SQL changed.
- Loop until no task is pending. Then push and stop.

## Honesty rules

- A PASS requires a cited command, test, or manual step.
- Report blocked work as blocked, with its owner. Never dress a credential blocker as engineering work.
- Closing one gap never means "risk is complete."
