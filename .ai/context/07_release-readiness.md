# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Milestone 1 — supervised one-atelier pilot

Production migration `20261108173000` is applied and remote migration parity is current. A hermetic
verification harness now runs the six browser journeys against a disposable local Supabase stack with
no production credentials: it passed 6/6 twice in a row, and its seven negative controls and
`dump → restore → RLS` rehearsal pass locally. Evidence: `docs/evidence/2026-11-09_e2e-harness.md`.

This is local proof, not a hosted release. The deployed artifact and live backup/restore have not
been verified in this task, and no live booking has been confirmed.

Current hard blockers:

- Publish the reviewed branch artifact through a preview and rerun the six journeys against the
  deployed URL. Pending harness changes are not pushed, and the available GitHub token lacks the
  `workflow` scope.
- Complete a backup/restore of pilot data using `SOURCE_DB_URL` and the production database
  password. The local-source rehearsal is proven; the hosted restore is credential-blocked.
- Move the Vercel project off the Hobby plan before a paid pilot (Hobby forbids commercial use) and
  configure a secondary region if availability claims are needed.

See `docs/release-readiness.md`, `docs/evidence/2026-11-09_e2e-harness.md`,
`docs/evidence/2026-11-08_v1.4.0-rc.3-hosted-recovery.md`, and
`docs/runbooks/pilot-operations.md`.

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
