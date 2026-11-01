# Release Readiness Brief

> Canonical: `docs/release-readiness.md`. This list is the authoritative to-do.

## Launch gates

| ID | Gate | Status | Evidence |
|----|------|--------|----------|
| L0 | Operating scaffold (docs, ADRs, sprints, agents) | DONE | commit + `sprints/sprint-00-operating-scaffold.md` |
| L1 | Reproducible migration chain on an empty database | DONE | `docs/evidence/2026-11-01_database_chain.md` |
| L2 | RLS isolation suite passes in CI | DONE | same evidence + `supabase/tests/rls_isolation_test.sql` |
| L3 | Local imagery bundles with hashed URLs | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired for every supported action | DONE | `docs/evidence/2026-11-01_persistence.md` |
| L5 | CI runs lint, build, docs links, DB verification | PENDING | — |
| L6 | Release versioned, tagged, pushed | PENDING | — |
| L7 | Cleanup (nested clone gone, obsolete script removed, lock committed) | PENDING | — |
| L8 | README, CHANGELOG, sprints updated | PENDING | — |
| L9 | Deployment verified | BLOCKED | Netlify authorization + Supabase project access are human-owned |

## P0 definitions

- A cross-tenant read or write.
- A patron able to read another patron's balance.
- Demo PIN accepted in a production build.
- A migration chain that cannot reproduce the schema the client queries.
- A secret in the repository.

## Rule

A gate is DONE only when its evidence row cites a command, test, or manual step that was actually
run. Narrative alone is not evidence (Constitution Article VII).
