# ADR-012 — Vercel hosting for the supervised static pilot

**Status:** Accepted by owner
**Approved by:** daniel-muhoro (owner)
**Date:** 2026-11-08
**Supersedes:** ADR-007's Netlify provider choice for the current pilot

## Context

The supervised Milestone 1 product is a static React/Vite SPA with no application server. The
supported `dev`, `build`, and `preview` scripts use `vite.pilot.config.ts`; production data access
remains in the browser through Supabase's publishable key and Postgres RLS. The prior Netlify site
cannot publish because its account has exceeded its deploy-credit limit, and its live bundle points
at a retired Supabase project.

The owner selected Vercel as the pilot deployment target. This changes the hosting provider, not the
application architecture or the pilot's feature scope.

## Decision

1. Deploy the existing static SPA to Vercel from `dist/`, with an SPA fallback and the security and
   cache headers in `vercel.json`.
2. Keep the supported `npm run build` path on `vite.pilot.config.ts`. Do not add a TanStack Start
   entry or SSR plugin to satisfy static preview or deployment.
3. Configure `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL`, and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel Production environment only. Configure preview
   builds with `VITE_DATA_MODE=demo`; never configure a service-role key in Vercel browser builds.
4. Require the existing postbuild artifact gate to pass in Vercel's `VERCEL_ENV=production`
   context. The gate must reject demo artifacts, missing configuration, retired project refs, and
   artifact/environment project drift.
5. Keep Netlify configuration only as legacy history; Vercel is the authoritative pilot host.
   The former Netlify artifact is not a rollback target unless it is rebuilt, published, and
   independently verified against the active Supabase project.
6. ADR-008's approved SSR direction is not implemented by this pilot decision. SSR remains outside
   Milestone 1 and requires its own implementation, verification, and deployment decision.

## Consequences

- Vercel project creation/linking, domain selection, environment variables, and Supabase Auth URL
  allowlisting require owner-controlled dashboard access.
- The deploy is not pilot-ready until the production deployment passes artifact, live role, and
  booking verification.
- Vercel's immutable deployments provide a rollback target, but rollback must still be checked
  against the active Supabase project and current schema.
- No guest booking, payment, messaging, or other Milestone 2 capability is added.

## Alternatives considered

- **Restore Netlify credits:** not selected by the owner.
- **TanStack Start/SSR migration:** not needed for the supervised static pilot and is not part of
  this deployment-provider change.
- **Container/server host:** unnecessary for the current static SPA.
