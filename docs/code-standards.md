# Code Standards

> Canonical standards. Agent summary: `.ai/context/04_code-standards.md`.

## TypeScript

- `strict` is enabled. `npm run lint` is `tsc --noEmit`; there is no ESLint layer.
- Domain shapes come from `src/types.ts`. Do not fork a second shape in a component.
- Never widen a type to silence an error. Model the real state, including loading and error.
- `any` is confined to Supabase row boundaries and narrowed immediately.

## React

- Named function components. Hooks at the top level.
- Cross-view state belongs in `StitchFlowContext`; local ephemeral UI state stays in the component.
- Components never import the Supabase client directly. They call context actions.
- No new state library.

## Repository layer

- Every write is an exported `persist*` function in `src/lib/atelier-repository.ts`.
- Resolve `order_code → id` explicitly. Do not assume the client `Order.id` is a UUID.
- Throw on error. Never return a silent success.
- New read paths return domain types, not raw rows.

## Supabase and configuration

- `src/lib/supabase.ts` is the only `createClient` call site.
- Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_DATA_MODE` may reach the client.
- A production build must use `VITE_DATA_MODE=supabase`.

## SQL

- Forward-only migrations. Never edit an applied file.
- Idempotent DDL (`if not exists`, `create or replace`, guarded `do $$`).
- `SECURITY DEFINER` functions pin `search_path = ''`, qualify relations, and revoke `PUBLIC`/`anon`.
- Every tenant table: `atelier_id` FK, index, RLS enabled, explicit policies.
- Seed data only in `supabase/seed.sql`.

## Money and currency

- Store `numeric(12,2)`.
- Convert to `number` only at the display boundary.
- Format KES, USD and NGN through one helper.
- A new currency requires: DB constraint, client union type, formatter, and a test.

## Assets

- Import local images (`import img from '../assets/images/x.jpg'`), never reference
  `/src/assets/...` at runtime.
- Vite hashes and emits imported assets into `dist/assets/`.

## Tests and evidence

- RLS changes add a scenario to `supabase/tests/rls_isolation_test.sql` that fails without the change.
- Wire-level claims need a test on the real call path.
- Evidence follows `docs/evidence/README.md`.

## Commits

Conventional prefix, imperative subject, one concern. Reference the doc that moved with the code.
