# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Milestone 1 — supervised one-atelier pilot

Production migration `20261108173000` is applied and remote migration parity is current. A hermetic
verification harness now runs the six browser journeys against a disposable local Supabase stack with
no production credentials: it passed 6/6 twice in a row, and its fourteen negative controls and
`dump → restore → RLS` rehearsal pass locally. Evidence: `docs/evidence/2026-11-09_e2e-harness.md`.

The approved Vercel deployment is READY and hosted owner/employee/patron read-only journeys pass
3/3. The protected hosted booking confirmation journey passed 1/1 after clearing a stale date
override; the script-owned fixture is now consumed, so any further write-capable run needs renewed
owner authorization. Live backup/restore is blocked: the direct source host is IPv6-only and
unreachable from the rehearsal container, and the reachable Session pooler rejected authentication.
Remote push and PR CI both pass on `ac22102` after moving the production-landing smoke out of the
demo build context and leaving it in the hermetic Supabase-mode browser suite.

Node.js is now declared once: `.nvmrc` and `package.json#engines.node` both say major 22,
`npm run check:node` fails on drift, CI enforces it in strict mode, and the Vercel project reports
`22.x`. A local production-target `vercel build` passes, but a Vercel-hosted remote source build is
still unproven because `vercel build` runs locally. Evidence:
`docs/evidence/2026-11-13_node-version-contract.md`.

Current hard blockers:

- Authorize one source deploy so Vercel's own build runtime is exercised.
- Complete a backup/restore of pilot data. The direct database host is IPv6-only and unreachable;
  the Session pooler endpoint is reachable but rejected authentication. The owner must verify the
  Dashboard-generated username and current database password, then re-enter the URI. The latest
  hosted attempt exited 2 before dumping.
- This agent shell still inherits two credential-shaped `VITE_*` names, while the owner's terminal
  reports a clean environment. The production build passes when those unrelated exports are excluded
  for that command; no value was printed. Any required credential rotation remains owner-controlled.
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
