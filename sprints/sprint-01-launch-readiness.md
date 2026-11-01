# Sprint 01 — Launch Readiness v1.0.0

**Status:** IN PROGRESS
**Date:** 2026-11-01

## Objective

Make StitchFlow reproducible, provable, and shippable: a database chain that rebuilds from empty, an
RLS suite that denies every cross-tenant attack, bundled cultural imagery, wired persistence, CI, a
versioned release, and honest documentation.

## Layers

| Layer | Scope | Status | Proof |
|-------|-------|--------|-------|
| L1 | Migration chain replays from empty; seed separated; currency contract aligned | PENDING | `docs/evidence/2026-11-01_database_chain.md` |
| L2 | RLS isolation suite (10 scenarios) green | PENDING | same evidence |
| L3 | Local imagery imported through Vite, hashed in `dist/` | PENDING | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired; demo PIN fails closed in production; currency and status drift fixed | PENDING | lint/build + sprint record |
| L5 | CI: lint, build, artifacts, docs, DB | PENDING | `.github/workflows/ci.yml` |
| L6 | Version 1.0.0, changelog, release notes, annotated tag | PENDING | `docs/evidence/2026-11-01_release.md` |
| L7 | Cleanup: nested clone, obsolete script, lockfile, ignores | PENDING | clean tree |
| L8 | README, CHANGELOG, sprints final | PENDING | release commit |
| L9 | Deployment | BLOCKED | owner authorization |

## Constraints

- Do not genericize African couture structures or measurement labels.
- Do not weaken a test to go green.
- Do not claim a hosted verification that was not performed.
- Every layer commits individually and leaves the tree green.

## Outcome

Filled in as layers close. Final sign-off is in `docs/release-readiness.md`.
