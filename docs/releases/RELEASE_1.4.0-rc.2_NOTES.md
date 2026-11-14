# StitchFlow v1.4.0-rc.2

**Status:** prerelease checkpoint; hosted schema repaired, browser pilot still blocked on identities.

This checkpoint continues `v1.4.0-rc.1`. It applies the tracked booking schema to the connected
production project and reconciles its migration history. It does not promote the release to stable.

## Included

- Production migration history reconciled: remote `20261106122030` was proven equivalent to local
  `20261106160000_atomic_owner_onboarding.sql` and recorded under the canonical local version.
- Seven missing migrations applied to production: booking engine, staff slice, audit log, owner
  invitation permissions, appointment source, appointment/booking status guard, and the client
  appointment-insert boundary.
- Hosted schema now contains the five booking tables and the four protected booking RPCs.
- Hosted RLS/onboarding proof passes and leaves no fixture rows behind.
- Local proof remains green: 14 RLS scenarios, B1–B23, S1–S7, and the 200-attempt concurrency test.

## Verification and open gates

`supabase db push --dry-run --remote` is up to date, and `supabase migration list --remote` matches
local for every version. See
[`hosted repair evidence`](../evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md).

Production has no accounts yet. Hosted owner/employee/patron browser journeys cannot run until the
repository owner provisions identities or deliberately seeds pilot tenants. The Netlify site is
configured for Supabase mode in production, but publishing is blocked: Netlify rejects new deploys
with `403 Account credit usage exceeded`. The live site therefore still serves a bundle that embeds
the retired project `vpathqzkaqdtbykumxeo` — a defect that predates this checkpoint. The corrected
artifact passes the production gate and is ready in `dist/`.

Guest booking rate limits, payments, transactional messaging, media storage, and operational
monitoring remain out of scope for this checkpoint.
