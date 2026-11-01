# Architecture Brief

> Condensed from `docs/architecture.md`. Read the canonical file for full detail.

## Stack

- **UI:** React 19 + TypeScript, single-page application.
- **Build:** Vite 8 (`@vitejs/plugin-react`), Tailwind CSS 4 through `@tailwindcss/vite`.
- **Icons/motion:** `lucide-react`, `motion`.
- **Backend:** Supabase Postgres + Auth + PostgREST, called from the browser with the publishable key.
- **Data access:** raw `@supabase/supabase-js` queries in `src/lib/atelier-repository.ts`. No ORM.
- **Hosting:** static build published to Netlify (`netlify.toml`).
- **CI:** `.github/workflows/ci.yml` (lint, build, docs links, database verification) — added in
  release layer L5.

## Request lifecycle

```
Browser
  → src/main.tsx → src/App.tsx
  → src/context/StitchFlowContext.tsx (role, theme, tenant, state)
  → component action
  → persist*() in src/lib/atelier-repository.ts   [VITE_DATA_MODE=supabase]
  → supabase-js → PostgREST → Postgres RLS
  → snapshot reload → React state
```

In `VITE_DATA_MODE=demo` the context writes to namespaced `localStorage` through
`src/lib/storage.ts` and never calls Supabase. Demo mode is a presentation surface, not a
persistence guarantee.

## Module map

| Concern | Location |
|---------|----------|
| App shell, route-less views | `src/App.tsx`, `src/components/` |
| Global state and actions | `src/context/StitchFlowContext.tsx` |
| Domain types | `src/types.ts` |
| Seed/demo data | `src/data/initialData.ts`, `src/assets/images/` |
| Supabase client and mode gate | `src/lib/supabase.ts` |
| Queries and mutations | `src/lib/atelier-repository.ts` |
| Browser persistence (demo) | `src/lib/storage.ts` |
| Schema and RLS | `supabase/migrations/` |
| Seed | `supabase/seed.sql` |
| RLS proof | `supabase/tests/rls_isolation_test.sql` |
| DB verification harness | `scripts/verify-db.sh`, `scripts/db/supabase-shim.sql` |

## Build and deploy

- `npm run lint` → `tsc --noEmit`.
- `npm run build` → `dist/`.
- `npm run verify:db` → disposable `postgres:16` migration chain + RLS suite.
- Netlify publishes `dist/` with an SPA fallback and security headers.

## Known architectural gaps

| Gap | Severity | Owner layer |
|-----|----------|-------------|
| Context still writes demo arrays in some paths | P1 | Persistence |
| `express` is declared but unused | P3 | Cleanup |
| No server-side appointment capacity lock | P1 | Post-launch |
| No media storage; URLs are remote or bundled | P2 | Post-launch |
| Auth UI demo PIN remains reachable | P0 in production | Security |
