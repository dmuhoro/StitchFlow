# Architecture

> Canonical architecture for StitchFlow. Agent summary: `.ai/context/01_architecture.md`.
> The SSR shell in [ADR-008](adr/ADR-008-single-tanstack-start-app.md) is **Proposed, not built**.
> Everything in §1–§5 describes the code that exists today.

## 1. Shape

StitchFlow is a static single-page application. There is no application server in this repository.
The browser renders the atelier experience and talks directly to Supabase PostgREST using the
publishable key. Authorization is entirely Postgres Row Level Security.

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  React 19 + Vite 8 + Tailwind 4                              │
│  StitchFlowContext ──► atelier-repository ──► supabase-js    │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS (publishable key + JWT)
┌───────────────────────────────▼──────────────────────────────┐
│ Supabase                                                     │
│  Auth ──► PostgREST ──► Postgres with RLS on every table     │
└──────────────────────────────────────────────────────────────┘
```

Static hosting is Netlify (`netlify.toml`): `npm run build` → `dist/`, SPA fallback to
`index.html`, and security headers.

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
database. `supabase/seed.sql` provisions two pilot tenants. RLS is enabled on all nine tenant tables.
The authoritative policy set is `20261031112000_rls_final.sql`.

Verified limits of this layer (2026-11-05 audit):

- 52 policies across 9 tables; 8 `SECURITY DEFINER` functions; 0 exclusion constraints.
- No audit/ledger/webhook tables and no `create_atelier_for_current_user` RPC.
- `appointments` has no resource, duration, hold, idempotency key, or overlap constraint, and no
  owner/employee `INSERT` policy.

See [`db-contracts.md`](db-contracts.md) for table contracts and
[`security.md`](security.md) for the invariant list.

## 6. Verification

| Check | Command | What it proves |
|-------|---------|----------------|
| Types | `npm run lint` | `tsc --noEmit` is clean |
| Bundle | `npm run build` | Production build succeeds |
| Artifacts | `npm run verify:build` | No literal source paths; no secret in output. **It does not prove demo code is absent** — see the P0 in `docs/audit/2026-11-05_sprint-0-audit.md` |
| Docs | `npm run check:docs` | Every relative Markdown link resolves |
| Database | `npm run verify:db` | Chain applies to empty DB; 12-scenario RLS suite passes |
| CI | `.github/workflows/ci.yml` | All of the above on every push |

## 7. Deployment

Netlify builds from `main`. Required environment: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_MODE=supabase`. The deploy is authorized by the
repository owner; the agent must never request a token in chat. See
[`runbooks/deployment.md`](runbooks/deployment.md).

## 8. Deliberate non-goals

No server framework, no ORM, no server-side rendering, no payments in v1.0.0, and no multi-atelier
membership per user. These are recorded so a future change does not assume they exist.

Two of these are now proposed changes, not permanent non-goals: ADR-008 proposes a single TanStack
Start app for SSR, and ADR-010 proposes an append-only payments ledger. Neither is implemented.
Until the owner approves those ADRs, the non-goals above remain the shipped truth.
