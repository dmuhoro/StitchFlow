# ADR-008 — One TanStack Start application with a public SSR group and an authenticated app group

**Status:** Approved by owner — 2026-11-05
**Approved by:** daniel-muhoro (owner)
**Date:** 2026-11-05
**Supersedes:** ADR-005 (runtime demo switch) and ADR-007 (static-only deployment shape)

## Context

The current product is a route-less Vite single-page application. Every view, including the public
lookbook, is rendered in the browser after JavaScript loads. There is no URL per atelier, no
server-rendered metadata, no share preview, and no page that works without JavaScript. Sprint 2
requires server-rendered public pages per atelier (home, services, lookbook, about, contact, privacy,
terms), real titles and OG images, a sitemap, structured data, and tenant branding. Sprint 1 requires
the production bundle to contain zero demo code and authenticated routes whose data is loaded on the
server.

A second static site would duplicate the domain model, the design system, and the tenant-resolution
logic. A separate API server would duplicate authorization and drift from RLS. Both are rejected
below.

TanStack Start provides file-based routing, server-side rendering, server functions, and a Vite
build while keeping React 19 and the existing component language. It lets the public surface and the
authenticated surface live in one deployable application without sharing a runtime bundle.

## Decision

1. **One application.** StitchFlow becomes a single TanStack Start application (React 19, Vite,
   TypeScript). The existing domain types, repository contracts, design tokens, and cultural
   measurement vocabulary are preserved. Supabase remains the relational backend and RLS remains the
   authorization boundary (ADR-001, ADR-002).
2. **Two route groups.**
   - `src/routes/_public/` is the server-rendered public front door. It resolves a tenant, loads only
     public columns and published lookbook rows, and renders complete HTML with metadata, OG tags,
     JSON-LD, sitemap, and robots. It must render without client JavaScript.
   - `src/routes/_app/` is the authenticated operating surface (owner, artisan, patron). It uses the
     same components and repository contracts, but data is loaded through authenticated server
     functions or route loaders.
   - `src/routes/__root.tsx` owns HTML shell, theme, error boundary, and security headers/nonces.
3. **Server boundary.** Privileged work (guest booking, payments, invitations, webhooks) runs in
   server functions or edge functions using server-only secrets. The browser never receives a
   service-role key. Public SSR reads use the publishable key and RLS; they do not need a service
   role.
4. **Session handling.** Production authentication uses Supabase Auth with an HTTP-only, secure,
   same-site cookie through `@supabase/ssr`. The JWT is not persisted in `localStorage` in
   production. The browser client may still use the publishable key for live subscriptions, but
   authorization decisions remain in Postgres.
5. **Demo is a build, not a branch.** `VITE_DATA_MODE` stops being a runtime switch. Demo becomes a
   separate build target deployed only to a demo subdomain (for example `demo.stitchflow.app`).
   Production code paths contain no demo profiles, no demo PIN, no seeded arrays, and no
   client-side role gate. A CI artifact assertion fails if a production build contains any demo
   marker. This supersedes ADR-005's runtime fallback design; the fail-closed principle remains.
6. **Hosting.** The host must execute SSR. Netlify remains the preferred host if its TanStack Start
   adapter is maintained; otherwise a Node host is acceptable. The static-only SPA fallback in
   `netlify.toml` is replaced by SSR routing. ADR-007's environment and rollback rules still apply.
7. **Migration sequence.** ADR work and route scaffolding land before public page work. The existing
   repository functions are ported behind server-side adapters, then the context is retired view by
   view. No sprint may leave two sources of truth for the same screen.

## Consequences

- Public pages become shareable and indexable, and work without JavaScript.
- CSP can use nonces because HTML is server-rendered; HSTS and the existing headers move to the SSR
  host configuration.
- Authenticated pages gain server-side data loading, which removes the current "flash of empty
  state" and the risk of a client choosing its own tenant.
- The build is no longer a static folder. Deployment, rollback, and local development runbooks must
  describe a server process or an SSR adapter.
- Tests must cover SSR HTML, no-JS rendering, metadata, and route guards, not only React components.
- The demo build remains available for design review but is no longer reachable from production.

## Alternatives considered

- **Keep the SPA and add a separate marketing site.** Rejected: duplicates tenant resolution,
  branding, lookbook rendering, and design tokens; two releases can disagree.
- **Next.js / Remix.** Viable, but adds a larger framework migration and does not preserve the
  existing Vite/TanStack direction. TanStack Start keeps the React/Vite toolchain and route model.
- **A custom Express server around the SPA.** Rejected in ADR-001: duplicates authorization and
  adds an unproven server surface without SSR benefits.
- **Prerender only the public pages at build time.** Rejected: atelier branding, lookbook, and
  availability are tenant data that change without a deploy.

## Sprint 1 implementation link

Owner onboarding and invitation redemption remain server-boundary operations. The deployed
`create_atelier_with_owner` RPC and browser acceptance proof are tracked in
[`supabase/migrations/20261106160000_atomic_owner_onboarding.sql`](../../supabase/migrations/20261106160000_atomic_owner_onboarding.sql),
[`src/lib/atelier-repository.ts`](../../src/lib/atelier-repository.ts), and
[`e2e/invite-flow.spec.ts`](../../e2e/invite-flow.spec.ts). The browser never receives a service-role key.
