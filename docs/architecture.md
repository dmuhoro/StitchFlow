# Architecture

> Canonical architecture for StitchFlow. Agent summary: `.ai/context/01_architecture.md`.
> [ADR-008](adr/ADR-008-single-tanstack-start-app.md) is an approved future direction, not built.
> Everything in §1–§5 describes the code that exists today.

## 1. Shape

StitchFlow is a static single-page application. There is no application server in this repository.
The browser renders the atelier experience and talks directly to Supabase PostgREST using the
publishable key. Authorization is entirely Postgres Row Level Security.

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  React 19 + Vite 8 + Tailwind 4                              │
│  StitchFlowContext ──► atelier repositories ──► supabase-js │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS (publishable key + JWT)
┌───────────────────────────────▼──────────────────────────────┐
│ Supabase                                                     │
│  Auth ──► PostgREST ──► Postgres with RLS on every table     │
└──────────────────────────────────────────────────────────────┘
```

Static hosting for the supervised pilot is Vercel (`vercel.json`): `npm run build` uses the
Milestone 1 SPA configuration (`vite.pilot.config.ts`) to produce `dist/`, with an SPA fallback to
`index.html` and security headers. `netlify.toml` is retained as legacy configuration; it is not the
authoritative deployment target. Both Vite configs describe the static SPA; supported app scripts
explicitly select `vite.pilot.config.ts`.

## 2. Modules

| Module | Responsibility |
|--------|----------------|
| `src/main.tsx` | React root, error boundary |
| `src/App.tsx` | Shell, active view, modal mounting |
| `src/components/` | Presentation, portals, modals |
| `src/context/StitchFlowContext.tsx` | Role, tenant, theme, state, actions, mode switch |
| `src/lib/supabase.ts` | Client creation and fail-closed mode gate |
| `src/lib/atelier-repository.ts` | All reads and writes; row → domain mapping |
| `src/lib/storage.ts` | Namespaced `localStorage` for demo mode |
| `src/data/initialData.ts` | Demo tenancy and records |
| `vite.pilot.config.ts` | Supported static SPA build for the managed pilot |
| `src/types.ts` | Domain contracts |
| `src/assets/images/` | Bundled couture imagery |

## 3. State and data flow

1. On mount, the context reads demo data or, in `supabase` mode, resolves the authenticated member
   and loads an atelier snapshot.
2. A component dispatches an action from the context.
3. In `demo` mode the action mutates state and writes the namespaced store.
4. In `supabase` mode the action calls a `persist*` function, then reloads or patches state from the
   confirmed result. A thrown error becomes an explicit toast; success is never assumed.
5. Role and view rendering are separate from authorization. `AccessGate` is presentation only.

## 4. Data modes

`VITE_DATA_MODE` is `demo` or `supabase`. Unknown values fall back to `demo`. In `supabase` mode the
module throws at import if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing. This is
deliberate: a misconfigured production build must fail loudly, not silently serve demo data.

## 5. Database

The tracked chain under `supabase/migrations/` rebuilds the schema the client queries from an empty
database. `supabase/seed.sql` provisions two pilot tenants. RLS is enabled on all 16 public tables.
The authoritative policy set is `20261031112000_rls_final.sql`; the Sprint 3 booking engine is
`20261107120000_booking_engine.sql`.

Verified state of this layer (2026-11-07 booking-engine run):

- 69 policies across 15 tables; 16 non-trigger `SECURITY DEFINER` functions (6 added by the booking
  engine); 1 exclusion constraint.
- `bookings` carries
  `EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE status IN ('held', 'confirmed')`.
  The database, not the client, is the authority on overlap.
- Every booking write goes through `hold_slot`, `confirm_booking`, `cancel_booking`, or
  `reschedule_booking`. `bookings` has no `INSERT`/`UPDATE`/`DELETE` RLS policy, so a direct
  PostgREST write cannot bypass the tenant check, expiry sweep, idempotency ledger, or exclusion.
- Guest contact details can be stored only by staff in this layer; anonymous callers cannot execute
  any booking RPC.
- `appointments` remains the fitting request inbox, without resource, duration, hold, or overlap
  semantics. A database guard blocks confirmation/completion unless a linked `bookings` row is
  confirmed, and booking transitions synchronize request status. The owner workspace reads
  availability, confirms via hold/confirm RPCs, and cancels via `cancel_booking`. Direct anonymous
  appointment writes are disabled until a rate-limited guest boundary is deployed. Authenticated
  clients can insert only their own pending request, without a staff assignment; other roles cannot
  use that insert policy.

See [`db-contracts.md`](db-contracts.md) for table contracts and
[`security.md`](security.md) for the invariant list.

## 6. Verification

| Check | Command | What it proves |
|-------|---------|----------------|
| Types | `npm run lint` | `tsc --noEmit` is clean |
| Repository writes | `npm run test:unit` | Tenant resolution fails closed; duplicate human keys cannot update another atelier |
| Bundle | `npm run build` | Production build succeeds |
| Artifacts | `npm run verify:build` | No literal source paths or secrets; Supabase-mode build also rejects known demo identities, PIN, credential cards, tenant slugs and demo copy |
| Browser smoke | `npm run test:e2e -- --grep "public entry renders"` | Public entry renders and its sign-in action opens the auth dialog |
| Docs | `npm run check:docs` | Every relative Markdown link resolves |
| Database | `npm run verify:db` | Chain applies to empty DB; 14-scenario RLS suite, 15 E2E scenarios, booking RPC suite, and a 200-attempt / 50-concurrent exclusion proof pass |
| CI | `.github/workflows/ci.yml` | All of the above on every push |

## 7. Deployment

Vercel builds from the connected repository using `npm run build` and `vite.pilot.config.ts`.
Required Production environment: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_MODE=supabase`. Preview deployments use demo mode.
Vercel's `VERCEL_ENV=production` activates the postbuild production gate. The deploy is authorized
by the repository owner; the agent must never request a token in chat. See
[`runbooks/deployment.md`](runbooks/deployment.md).

## 8. Deliberate non-goals

No server framework, no ORM, no server-side rendering, no payments in v1.0.0, and no multi-atelier
membership per user. These are recorded so a future change does not assume they exist.

ADR-008 approves a future single TanStack Start app for SSR, and ADR-010 proposes an append-only
payments ledger. Neither is implemented. SSR, payments, and other Milestone 2 work are not part of
the supervised Vercel pilot.
