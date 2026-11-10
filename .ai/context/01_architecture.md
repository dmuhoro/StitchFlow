# Architecture Brief

> Condensed from `docs/architecture.md`. Read the canonical file for full detail.

## Stack

- **UI:** React 19 + TypeScript, single-page application.
- **Build:** Static Vite 8 SPA via `vite.pilot.config.ts` (`@vitejs/plugin-react`), Tailwind CSS 4
  through `@tailwindcss/vite`. Both Vite configs describe the static SPA; supported app scripts
  explicitly select the pilot config.
- **Icons:** `lucide-react`.
- **Backend:** Supabase Postgres + Auth + PostgREST, called from the browser with the publishable key.
- **Data access:** raw `@supabase/supabase-js` queries in `src/lib/atelier-repository.ts`. No ORM.
- **Hosting:** static build published to Vercel (`vercel.json`) per ADR-012; `netlify.toml` is legacy.
- **CI:** `.github/workflows/ci.yml` gates all branch pushes and pull requests with lint, unit,
  docs, build/artifact, database, and credential-free hermetic browser jobs. The latest remote
  run's demo-artifact smoke mismatch is corrected locally; a green remote rerun is pending.

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
Local database and hosted journey evidence is recorded in
`docs/evidence/2026-11-08_milestone-1-pilot-hardening.md`; live-site verification is pending
publication. Anonymous appointment inserts and live visitor booking are disabled until a
rate-limited guest boundary exists.

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
- `npm run build` → `dist/` using the static pilot config.
- `npm run verify:db` → disposable `postgres:16` migration chain + RLS suite + booking RPC suite +
  200-attempt concurrency proof.
- Vercel publishes `dist/` with an SPA fallback and security headers.

## Approved or proposed, not built

[ADR-008](../../docs/adr/ADR-008-single-tanstack-start-app.md) is an approved future direction to
replace this static SPA with one TanStack Start app (public SSR group + authenticated app group).
It is not implemented and is outside the supervised pilot. Do not describe SSR as shipped.

[ADR-011](../../docs/adr/ADR-011-tenant-resolution.md) proposes server-side tenant resolution by
verified domain, then subdomain, then slug. Today the client still chooses the tenant.

## Known architectural gaps

| Gap | Severity | Owner layer |
|-----|----------|-------------|
| Supabase-mode demo artifact exclusion | Closed in current source; `verify:build` checks known demo markers | Sprint 1 |
| Appointment status guard and booking UI integration | Local database and hosted journey evidence pass; live-site proof pending | Sprint 3 |
| Capacity > 1 / `booking_slots` not implemented; capacity is constrained to 1 | P2 | Sprint 3 follow-up |
| No owner/employee `INSERT` policy on `appointments` | Intentional; staff booking uses protected RPCs | Sprint 3 |
| Tenant chosen client-side; public path defaults to Nairobi | P1 | Sprint 2 |
| SSR, per-tenant metadata, sitemap, robots or OG tags not implemented | Approved future scope; outside pilot | ADR-008 |
| No payments ledger or webhook table | P1 for payments; payments outside pilot | ADR-010 |
| No media storage; URLs are remote or bundled | P2 | Post-launch |
