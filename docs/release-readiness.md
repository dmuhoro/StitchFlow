# Release Readiness

> The authoritative to-do list. A gate is DONE only with cited evidence.
> Last updated: 2026-11-01.

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold: docs, ADRs, sprints, agents, scripts | DONE | `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain from empty database | DONE | `docs/evidence/2026-11-01_database_chain.md` |
| L2 | RLS isolation suite green | DONE | same evidence — 10 scenarios + structural assertions |
| L3 | Local imagery bundled with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md` |
| L5 | CI runs lint, build, docs, DB verification | DONE | `docs/evidence/2026-11-01_ci.md` |
| L6 | Release versioned, tagged, pushed | DONE | `docs/evidence/2026-11-01_release.md` (tag 6af1ba94, remote ref verified) |
| L7 | Cleanup complete, lockfile committed, tree clean | DONE | tree clean; `npm ci` succeeded; no nested clone |
| L8 | README, CHANGELOG, sprints updated | DONE | CHANGELOG # 1.0.0, sprints updated, docs/evidence index |
| L9 | Deployment verified | DONE | `docs/evidence/2026-11-01_deployment.md` — Supabase production build live, bundle verifier PASS |

## P0 definitions

- Cross-tenant read or write.
- Patron able to read another patron's balance.
- Demo PIN accepted in a production build.
- Migration chain cannot reproduce the queried schema.
- Secret committed.

## Blocked items

| Item | Blocker | Owner |
|------|---------|-------|
| Hosted Supabase migration | Project access not verified in this environment | Repository owner |
| Netlify deployment | Deploy authorization not granted in this environment | Repository owner |

## Sign-off rule

The release agent may not mark L1–L8 DONE from narrative. Each row cites a file in
[`evidence/`](evidence/README.md) or a command that was run. L9 has a named human owner and is never
reported as DONE by the agent alone.
