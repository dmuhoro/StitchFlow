# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold (docs, ADRs, sprints, agents) | DONE | `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain on an empty database | DONE | `docs/evidence/2026-11-01_database_chain.md`; re-proven 2026-11-05 |
| L2 | RLS isolation suite passes in CI | DONE | 12 scenarios: `docs/evidence/2026-11-05_sprint-0-verification.md` |
| L3 | Local imagery bundles with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md` |
| L5 | CI runs lint, build, docs links, DB verification | DONE | `docs/evidence/2026-11-01_ci.md` |
| L6 | Release versioned, tagged, pushed | DONE | `docs/evidence/2026-11-01_release.md` (tag `v1.0.0`) |
| L7 | Cleanup (dead deps, lockfile, tree) | DONE | `npm ci` 2026-11-05; commit `1bd06bb` |
| L8 | README, CHANGELOG, sprints updated | DONE | `CHANGELOG.md`, sprint records |
| L9 | Deployment verified | DONE (deploy only) | `docs/evidence/2026-11-01_deployment.md`; artifact contains demo code |

## Sprint 0a result

7 PASS / 1 FAIL across the eight verification gates. Gate 8 (appointment capacity and
double-booking) fails: `exclusion_constraints=0`, overlapping rows accepted, no staff `INSERT`
policy.

`v1.4.0-rc.1` records the locally verified booking integration as a prerelease checkpoint; it is
not production approval. `S0-P0-01` is closed in source and the production artifact assertion. Booking status guard and UI
wiring pass local DB verification. Production is missing booking tables/RPCs and has an unmatched
remote migration version (`20261106122030`); hosted browser role flows also need owner-provisioned
fixtures. Do not push migrations until the remote history is reconciled. See
`docs/evidence/2026-11-07-pilot-readiness.md` and `docs/audit/2026-11-05_sprint-0-audit.md`.

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
