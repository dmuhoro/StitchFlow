# ADR-011 — Tenant resolution by verified custom domain, subdomain, then reserved slug path

**Status:** Proposed — awaiting owner approval
**Date:** 2026-11-05

## Context

Tenant selection is currently a browser concern. `StitchFlowContext` defaults to a hardcoded Nairobi
tenant, stores a tenant id in `localStorage`, and lets demo mode switch between two seeded tenants.
The public lookbook is loaded by an atelier id chosen on the client. A shared link cannot identify
an atelier, a custom domain cannot work, and an anonymous booking always targets the default tenant.
That is a tenant-isolation defect at the product boundary even when RLS is correct.

The public front door needs stable, shareable URLs per atelier. Ateliers also want their own domain
(`atelier.example.com`) and a branded experience. Tenant resolution must happen on the server,
before data is loaded, and must fail closed for an unknown host.

## Decision

1. **Tenant identity is server-resolved.** The browser never chooses a tenant through
   `localStorage`, a query string, or a client-side id. An SSR request resolves exactly one atelier
   from the request host and path, or returns 404.
2. **Data model.**
   - `ateliers.slug` remains unique, lowercase, and URL-safe. It is the platform identity.
   - Add `tenant_domains`: `id`, `atelier_id`, `domain` (unique, normalised lowercase without port),
     `is_primary`, `verification_token`, `verified_at`, `ssl_status`, timestamps.
   - Add `atelier_slug_redirects`: old slug, atelier id, created time, so a slug change keeps shared
     links working with a 308 redirect.
3. **Resolution order** (first match wins, no fallback to a default tenant):
   1. **Verified custom domain.** Normalise `Host` (lowercase, strip port and trailing dot), look up
      a row with `verified_at is not null`. Serve that atelier.
   2. **Platform subdomain.** If the host is `*.stitchflow.app`, treat the first label as the
      atelier slug. An unknown label is 404.
   3. **Reserved slug path.** On the platform apex or localhost, `/{locale?}/atelier/{slug}` is the
      canonical path form. The `/atelier/` prefix is reserved and cannot be a slug.
   4. **Unknown host or slug.** 404 with no data query and no tenant-themed shell. Never render
      "the first atelier" as a fallback.
4. **Canonical redirects.** Each atelier has one primary domain. A verified secondary domain and the
   platform subdomain redirect with 308 to the primary domain when one is configured. The redirect
   is server-side. Slug changes redirect old slugs for at least 12 months.
5. **Custom-domain onboarding.**
   - The owner adds a domain in settings.
   - The UI shows a DNS TXT challenge value derived from `verification_token` and the required
     CNAME/A record.
   - A server job verifies DNS, marks `verified_at`, and requests the host certificate.
   - A domain that is not verified serves 404 and never reveals the atelier.
   - Removing a domain releases it for another tenant only after a cooling-off period.
6. **Tenant context is passed to loaders.** The resolved `atelier_id` is attached to the request
   context and used by public loaders and by authenticated route loaders. Public queries are still
   constrained by `atelier_id` and RLS. Authenticated access additionally requires an active member
   row; a resolver cannot grant access to private data.
7. **Caching and SEO.** Cache keys include the resolved atelier id and host. Each tenant has its own
   sitemap, robots rules, canonical URL, OG image, and `LocalBusiness` JSON-LD generated from its
   verified primary domain. A shared link previews the correct atelier, not a generic shell.
8. **Local development.** `localhost` uses `/atelier/{slug}` by default. A developer may set an
   explicit local host mapping in a gitignored file, but no production host may resolve through a
   query parameter or environment default.
9. **Security.** The resolver trusts only the `Host` presented by the hosting edge after
   normalisation. It does not trust `X-Forwarded-Host` unless the edge is configured to overwrite
   it. Domain matching is exact after normalisation; no wildcard or suffix match beyond the
   controlled platform subdomain. Every unknown host is 404.

## Consequences

- A shared URL identifies one atelier; the WhatsApp preview, sitemap, and structured data are
  tenant-correct.
- Anonymous booking can no longer post to a default tenant; the server passes the resolved tenant
  into the booking boundary.
- Custom domains require DNS verification, certificate automation, and a domain-verification job.
  This is operational work with a human owner for DNS.
- `PREDEFINED_TENANTS` and the `localStorage` tenant switch are removed from production. Demo keeps a
  fixed tenant inside the separate demo build.
- Tenant-resolution tests must cover: verified domain, platform subdomain, slug path, unknown host,
  unverified domain, secondary-domain redirect, old slug redirect, and a host that tries to smuggle a
  different `atelier_id` in the payload.
- RLS remains the authorization boundary (ADR-002). Resolution is routing, not authorization.

## Alternatives considered

- **Client-selected tenant with a query parameter.** Rejected: any visitor can point at another
  tenant, links are ambiguous, and SSR cannot render tenant metadata before JavaScript.
- **A single shared domain with `/{slug}` at the root.** Workable, but collides with application and
  marketing routes, gives ateliers no branded origin, and makes custom domains a second-class path.
- **Custom domains only, no platform subdomain.** Rejected: onboarding would block on DNS before an
  atelier can share anything.
- **Wildcard DNS with no verification.** Rejected: anyone could claim a slug or point a domain at the
  platform without proving control.
