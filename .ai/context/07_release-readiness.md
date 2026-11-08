# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Milestone 1 — supervised one-atelier pilot

The production schema and migration history were reconciled through `20261107220000`. A new
financial-audit migration (`20261108173000`) passes local database/RLS verification but is not yet
applied remotely. Tenant-safe repository writes pass unit/local database tests, and six hosted
identities plus a fitting fixture exist across the pilot and an isolation-only tenant. Hosted
publishable-key verification passes 30/30; owner, employee, patron, and protected-booking journeys
pass against the fresh local artifact connected to hosted Supabase. Vercel is selected, but no
production Vercel deployment or live browser journey has been verified; the former Netlify artifact
still targets the retired project.

Current hard blockers:

- Owner must review/apply the financial-audit migration and run hosted verification.
- Owner must link/configure Vercel, set production Supabase variables, choose the final domain, and
  allowlist the Supabase Auth redirect URLs; engineering then verifies the live artifact and runs
  the role/booking journeys. Do not mutate the hosted fixture before publishing.
- The backup/restore rehearsal has not been performed.

See `docs/release-readiness.md`, `docs/evidence/2026-11-08_milestone-1-pilot-hardening.md`,
`docs/evidence/2026-11-08_vercel-pilot-readiness.md`, and `docs/runbooks/pilot-operations.md`.

## P0 definitions

- A cross-tenant read or write.
- A patron able to read another patron's balance.
- Demo code or demo credentials in a production artifact.
- Appointment double-booking accepted server-side.
- A migration chain that cannot reproduce the schema the client queries.
- A secret in the repository.

## Rule

A gate is DONE only when its evidence row cites a command, test, or manual step that was actually
run. Narrative alone is not evidence (Constitution Article VII). Deployment and hosted-database
claims are human-owned.
