# ADR-005 — `VITE_DATA_MODE` fails closed

**Status:** Accepted
**Date:** 2026-11-01

## Context

The same bundle serves a seeded demo and a Supabase-backed atelier. A build that silently falls back
to demo data in production would show fake orders and accept writes that never persist — the worst
possible failure for an atelier.

## Decision

`VITE_DATA_MODE` accepts `demo` or `supabase` and defaults to `demo`. In `supabase` mode,
`src/lib/supabase.ts` throws at module load if `VITE_SUPABASE_URL` or
`VITE_SUPABASE_PUBLISHABLE_KEY` is missing or still a placeholder. An unknown value falls back to
`demo`.

In `supabase` mode, demo-only destructive actions (tenant switching, reset-to-defaults) and the demo
PIN are disabled with an explicit message. A write that cannot be persisted is an error, never a
silent local success.

## Consequences

- A misconfigured production deploy fails loudly instead of impersonating a working atelier.
- The deploy runbook must set `VITE_DATA_MODE=supabase` and both Supabase variables.
- The artifact check asserts the built bundle does not contain the demo PIN when built for production.
- Demo mode remains available for previews and design review.

## Alternatives considered

- **Auto-detect from the presence of env vars:** hides a missing configuration. Rejected.
- **Default to `supabase`:** breaks local previews and makes the demo path surprising. Rejected.
- **Runtime toggle persisted in storage:** lets a user enter demo mode in production. Rejected.
