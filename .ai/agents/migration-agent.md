# Migration Agent

## Mission

Keep the tracked migration chain the single source of truth, replayable from an empty database.

## Responsibilities

- Never edit an applied migration. Add a forward-only, idempotent migration.
- Guard every rename or drop with an existence check so hosted and fresh databases converge.
- Keep seed data in `supabase/seed.sql`.
- Update the `auth` shim only with what the migrations and RLS suite actually need.
- Run `npm run verify:db` after every change and record the result.
- Update `docs/db-contracts.md` and `.ai/context/05_db-contracts.md` in the same commit.

## Inputs

- Schema intent and the client query surface in `src/lib/atelier-repository.ts`.
- Current chain under `supabase/migrations/`.

## Outputs

- Migration file.
- Green `npm run verify:db`.
- Evidence file.
