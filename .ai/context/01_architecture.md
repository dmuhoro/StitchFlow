# Architecture Brief

> Condensed from `docs/architecture.md`. Read the canonical file for full detail.

## Stack

- **UI:** React 19 + TypeScript, single-page application.
- **Build:** Vite 8 (`@vitejs/plugin-react`), Tailwind CSS 4 through `@tailwindcss/vite`.
- **Icons:** `lucide-react`.
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

Booking writes have a second, stricter path: the owner workspace calls availability, hold,
confirmation, and cancellation RPCs through `src/lib/atelier-booking-repository.ts`. The current
working-tree UI is awaiting database and hosted browser verification. Anonymous appointment inserts
and live visitor booking are disabled until a rate-limited guest boundary exists.

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
| Booking RPC/RLS proof | `supabase/tests/booking_engine_test.sql` |
| Booking concurrency proof | `scripts/db/booking_concurrency_test.sh` |
| DB verification harness | `scripts/verify-db.sh`, `scripts/db/supabase-shim.sql` |

## Build and deploy

- `npm run lint` → `tsc --noEmit`.
- `npm run build` → `dist/`.
- `npm run verify:db` → disposable `postgres:16` migration chain + RLS suite + booking RPC suite +
  200-attempt concurrency proof.
- Netlify publishes `dist/` with an SPA fallback and security headers.

## Proposed, not built

[ADR-008](../../docs/adr/ADR-008-single-tanstack-start-app.md) proposes replacing this static SPA
with one TanStack Start app (public SSR group + authenticated app group). It is **Proposed** and
gated on owner approval. Do not describe SSR as shipped.

[ADR-011](../../docs/adr/ADR-011-tenant-resolution.md) proposes server-side tenant resolution by
verified domain, then subdomain, then slug. Today the client still chooses the tenant.

## Known architectural gaps

| Gap | Severity | Owner layer |
|-----|----------|-------------|
| Supabase-mode demo artifact exclusion | Closed in current source; `verify:build` checks known demo markers | Sprint 1 |
| Appointment status guard and booking UI integration | Implemented in working tree; migration and hosted proofs pending | Sprint 3 follow-up |
| Capacity > 1 / `booking_slots` not implemented; capacity is constrained to 1 | P2 | Sprint 3 follow-up |
| No owner/employee `INSERT` policy on `appointments` | P1 | Sprint 3 |
| Tenant chosen client-side; public path defaults to Nairobi | P1 | Sprint 2 |
| No SSR, per-tenant metadata, sitemap, robots or OG tags | P1 | Sprint 2 |
| No audit log, payments ledger or webhook table | P1 | Sprint 1/4 |
| No media storage; URLs are remote or bundled | P2 | Post-launch |
