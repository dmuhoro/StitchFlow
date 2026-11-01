# AGENTS.md

Rules every agent (including OpenCode) must follow on every task in this repository.
Canonical governance: [`docs/engineering/CONSTITUTION.md`](docs/engineering/CONSTITUTION.md).
If this file and the Constitution disagree, the Constitution wins.

---

## 1. Read before you build

Before starting any task, read:

1. [`docs/current-state.md`](docs/current-state.md) — what is true today.
2. [`docs/architecture.md`](docs/architecture.md) — where code lives and how it flows.
3. [`.ai/context/11_workflow-rules.md`](.ai/context/11_workflow-rules.md) — how you may act.

If a task assumes a capability marked **ASPIRATIONAL** in `docs/current-state.md`, stop and say so
instead of building on top of it silently.

## 2. Tenant isolation is manual and non-negotiable

The browser talks to Supabase PostgREST directly. There is no server middleware that scopes
queries. Every repository query must either be constrained by `atelier_id` or rely on an RLS policy
proven by [`supabase/tests/rls_isolation_test.sql`](supabase/tests/rls_isolation_test.sql).

A cross-tenant read or write is a **P0 defect** regardless of environment or who introduced it.
Changing tenant-scoping logic requires updating [`docs/db-contracts.md`](docs/db-contracts.md) in the
same commit.

## 3. Never weaken a test to pass a build

Do not delete, skip, loosen, or re-threshold an assertion to make CI green. Fix the code, or record
the conflict and stop. A passing suite means the code is correct — not that the tests were silenced.

## 4. Enforcement goes at the real boundary

Before claiming a guard exists, read the actual call site and cite `file:line`. Protection belongs
where the live submission happens, not in a helper only tests or the demo path use. An "evidence"
check that can pass while the production path stays unguarded is a defect, not evidence.

## 5. Fail closed

Defaults refuse. `VITE_DATA_MODE` defaults to `demo`; `supabase` mode throws at module load when URL
or key is missing. Do not add a fallback that silently degrades a write.

## 6. No secrets in the repository

Credentials live in a gitignored `.env.local`, a secret manager, or the host's environment. Never put
a service-role key in a `VITE_*` variable, a commit, a log, a fixture, or an evidence file. Proving a
secret is wired means proving its **name and lookup**, never its value. If a secret is committed,
assume compromise, rotate first, then clean history.

## 7. Preserve African couture semantics

Do not genericize garment structures, measurement labels, or cultural provenance. Agbada wingspan,
Fila cap circumference, Sokoto inseam, Buba chest, Kitenge print alignment, Kanzu robe drop, and
posture/drape notes are product requirements, not decoration. Never replace them with generic
fashion fields.

## 8. Migrations are forward-only

Never edit a migration that has been applied to a shared database. Add a new, idempotent migration.
Seed data belongs in [`supabase/seed.sql`](supabase/seed.sql), never in a schema migration.

## 9. Every release gets a version and a tag

A behaviour change ships with a `package.json` version bump, a `CHANGELOG.md` entry, a sprint record
under [`sprints/`](sprints/README.md), and an annotated git tag pushed to the remote.

## 10. Docs move with code — in the same change

A behaviour change with stale documentation is an incomplete change. Update the canonical doc and
the `.ai/context` summary together. The `.ai/context` files are summaries plus pointers; if they
contradict `docs/`, `docs/` wins and the summary must be corrected.

## 11. Commits are explicit and singular

One concern per commit, conventional-commit prefix, imperative subject. State what changed and which
doc moved with it. Every commit must leave the tree green (`npm run lint`, `npm run build`, and
`npm run verify:db` when the database changed).
