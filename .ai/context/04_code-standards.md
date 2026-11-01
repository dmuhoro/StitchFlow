# Code Standards Brief

> Condensed from `docs/code-standards.md`. Follow these when writing code.

## TypeScript

- `strict` is on; `npm run lint` is `tsc --noEmit`. There is no separate ESLint pass.
- Prefer explicit domain types from `src/types.ts` over inline object shapes at module boundaries.
- Do not widen a type to silence an error. Fix the producer or model the state honestly.
- `any` is allowed only at a Supabase row boundary, immediately narrowed into a domain type.

## React

- Function components, named exports, `React.FC` only where the file already uses it.
- State lives in `StitchFlowContext` if more than one view needs it.
- Components do not call Supabase directly except `AuthModal` through context actions.
- No new global state library. The app is small enough for one context.

## Repository layer

Every mutation is an exported `persist*` function in `src/lib/atelier-repository.ts`:

- call `requireSupabase()` (throws when unconfigured),
- resolve human codes to UUIDs explicitly (`order_code → id`),
- throw on error; never return a silent `null` for a failed write,
- accept `atelierId` where the row needs it.

A new write path is not complete until the context calls it in `supabase` mode and the demo path
still behaves.

## Supabase client

- `src/lib/supabase.ts` is the only place `createClient` is called.
- `VITE_DATA_MODE` is `demo` or `supabase`; unknown values fall back to `demo`.
- Never import the service-role key into client code.

## SQL and migrations

- Forward-only. Never edit an applied migration.
- Idempotent where possible (`if not exists`, `create or replace`, guarded `do $$`).
- Pin `search_path` on `SECURITY DEFINER` functions and qualify every relation.
- Every new tenant table: `atelier_id` FK, RLS enabled, explicit policies, an index on `atelier_id`.
- Seed data belongs in `supabase/seed.sql`.

## Formatting and currency

- Store money as `numeric`, convert with `Number()` only at the display boundary.
- `formatCurrency(value, currency)` must handle KES, USD and NGN.
- Dates cross the boundary as ISO strings.

## Tests and evidence

- RLS changes require a scenario in `supabase/tests/rls_isolation_test.sql` that would fail without
  the policy.
- A passing test count never implies an unaddressed defect is fixed.
- Evidence files follow `docs/evidence/README.md`.

## Imports

- Vite alias `@` → repository root is configured, but components use relative imports today. Follow
  the file you are editing; do not mass-rewrite imports.
