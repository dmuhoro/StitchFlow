# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Milestone 1 — supervised one-atelier pilot

Production migration `20261108173000` is applied and remote migration parity is current. The
rollback-only hosted RLS proof and local database/RLS tests pass. The latest six-test Playwright run
against Vercel returned 1 pass and 5 failures, and the deployed site still exposes the old duplicate
header sign-in label while this checkout uses “Enter Atelier”. A disposable restore rehearsal and
successful live booking have not been completed.

Current hard blockers:

- Resolve the hosted UI/test mismatch in issue #6, push the reviewed branch (GitHub OAuth currently
  lacks `workflow` scope), publish a preview, and rerun all six browser tests with synthetic fixtures.
- Complete the disposable backup/restore rehearsal; local Supabase image pulls timed out and default
  ports were occupied, so no production dump or restore was created.
- Capture a successful live booking only after the current source is deployed and the live flow passes.

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
