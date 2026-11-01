# ADR-007 — Static SPA on Netlify with explicit environment

**Status:** Accepted
**Date:** 2026-11-01

## Context

StitchFlow has no application server. It needs static hosting, an SPA fallback, security headers, and
a place to declare the three browser variables. Netlify is already configured in `netlify.toml`.

## Decision

Deploy the Vite `dist/` output to Netlify. `netlify.toml` declares the build command, `dist` publish
directory, Node version, SPA redirect, and security headers. Environment variables are set in the
Netlify project settings, never committed:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_DATA_MODE=supabase`

The repository owner authorizes the deploy. The agent never asks for a token in chat and never
commits one.

## Consequences

- The build is portable to any static host; Netlify is a deployment choice, not an architectural
  lock-in.
- A deploy without the three variables produces a bundle that fails closed at load, which is visible
  immediately rather than silently serving demo data.
- Rollback is a redeploy of a previous immutable build.
- Server-only features (rate limiting, capacity locks) need edge functions or a database function.

## Alternatives considered

- **Vercel:** equivalent; Netlify is already wired.
- **Cloudflare Pages:** equivalent; no migration benefit.
- **Container/server:** unnecessary for a static SPA and adds operational cost.
