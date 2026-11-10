# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Milestone 1 — supervised one-atelier pilot

Production migration `20261108173000` is applied and remote migration parity is current. A hermetic
verification harness now runs the six browser journeys against a disposable local Supabase stack with
no production credentials: it passed 6/6 twice in a row, and its nine negative controls and
`dump → restore → RLS` rehearsal pass locally. Evidence: `docs/evidence/2026-11-09_e2e-harness.md`.

The approved Vercel deployment is READY and hosted owner/employee/patron read-only journeys pass
3/3. Hosted booking has not been confirmed because the guarded script-owned fitting precondition is
unmet; no fixture reset or booking write occurred. Live backup/restore remains credential-blocked.
Remote push and PR CI both pass on `ac22102` after moving the production-landing smoke out of the
demo build context and leaving it in the hermetic Supabase-mode browser suite.

Current hard blockers:

- Obtain owner approval to reset/recreate only the script-owned synthetic fitting, then complete
  the hosted booking journey.
- Verify Vercel source-build parity with the repository's `.nvmrc` Node.js version.
- Complete a backup/restore of pilot data using `SOURCE_DB_URL` and the production database
  password. The local-source rehearsal is proven; the hosted restore is credential-blocked.
- Move the Vercel project off the Hobby plan before a paid pilot (Hobby forbids commercial use; the
  selected supervised pilot is non-commercial).
  V2 scope, including multi-region failover, is deferred until the single-atelier pilot passes.

See `docs/release-readiness.md`, `docs/evidence/2026-11-09_e2e-harness.md`,
`docs/evidence/2026-11-10_pilot-gate-reconciliation.md`,
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
