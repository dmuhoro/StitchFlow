# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Milestone 1 — supervised one-atelier pilot

The production schema and migration history are reconciled. Tenant-safe repository writes pass
unit/local database tests, and six hosted identities plus a fitting fixture exist across the pilot
and an isolation-only tenant. Hosted publishable-key verification passes 30/30, and owner,
employee, and patron browser journeys pass 3/3, and protected booking confirmation passes 1/1 against the
fresh local production bundle connected to hosted Supabase. The live Netlify artifact still targets
the retired project.

Current hard blockers:

- Netlify returns `403 Account credit usage exceeded`; owner must restore credits and publish.
- Booking-confirmation browser flow against live deployment remains unverified; do not mutate the
  hosted fixture before the current artifact is published.
- The backup/restore rehearsal has not been performed.

See `docs/release-readiness.md`, `docs/evidence/2026-11-08_milestone-1-pilot-hardening.md`,
`docs/runbooks/pilot-operations.md`, and issue #4.

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
