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
| L1 | Migration chain replays from empty; seed separated; currency contract aligned | DONE | `docs/evidence/2026-11-01_database_chain.md` |
| L2 | RLS isolation suite (10 scenarios) green | DONE | same evidence |
| L3 | Local imagery imported through Vite, hashed in `dist/` | DONE | `docs/evidence/2026-11-01_build_artifacts.md` |
| L4 | Persistence wired; demo PIN fails closed in production; currency and status drift fixed | DONE | `docs/evidence/2026-11-01_persistence.md` |
| L5 | CI: lint, build, artifacts, docs, DB | DONE | `docs/evidence/2026-11-01_ci.md` |
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

### L1–L2 — Database chain and RLS (DONE)

- Removed the seed migration; schema and seed are now separate (ADR-003).
- Added `20261031110000_baseline_reconciliation.sql` so the tracked chain rebuilds the schema the
  client queries (ADR-004) and `20261031112000_rls_final.sql` as the authoritative policy set.
- Added `20261031113000_currency_alignment.sql` because the schema rejected `NGN` while the Lagos
  tenant trades in NGN — a real defect found by replaying the seed.
- Added `scripts/verify-db.sh` and `scripts/db/supabase-shim.sql` to replay the whole chain on a
  disposable Postgres without a hosted project.
- Reworked the RLS suite to 10 adversarial scenarios plus structural assertions, and tightened the
  patron-directory assertion to "self only, never another patron".
- Proof: `npm run verify:db` → exit `0`, all 10 scenarios PASS, recorded in
  `docs/evidence/2026-11-01_database_chain.md`.

### L3 — Bundled cultural imagery (DONE)

- Local couture photographs were referenced as literal source paths, which 404 in production.
- Imported all eight images through Vite (ADR-006), so they emit as hashed files under `dist/assets/`.
- Proof: `npm run build && npm run verify:build` → 8 hashed image assets, no source-path literal,
  recorded in `docs/evidence/2026-11-01_build_artifacts.md`.

### L4 — Persistence and fail-closed access (DONE)

- Wired the missing write paths: feedback resolution, lookbook publish, atelier settings.
- Fixed anonymous fitting requests: guests book against the public atelier with `client_id = null`
  and their name/phone are stored; members book against their own tenant.
- Fixed `NGN` balances collapsing to `KES` on read, and preserved Sokoto inseam and Buba chest in
  the measurement read/write path.
- Supabase mode no longer seeds demo orders/measurements/appointments/feedback/lookbook; the public
  lookbook is loaded through the anonymous policy.
- Demo role sign-in, demo PIN, tenant switching and destructive reset now refuse in production at
  the action boundary, not only in the UI.
- Proof: `npm run lint` clean; production-mode build and artifact assertions pass; recorded with
  `file:line` citations in `docs/evidence/2026-11-01_persistence.md`.

### L5 — Continuous integration (DONE)

- `.github/workflows/ci.yml` runs two required jobs on every push and pull request to `main`.
- `quality`: install from the lockfile, type check, documentation link check, demo build with
  artifact assertions, then a supabase-mode build with the same assertions plus runtime-guard checks.
- `database`: a `postgres:16` service container, `npm run verify:db:host`, replaying migrations,
  seed and the 10-scenario RLS suite.
- Proof: the CI `host` branch was exercised locally against a published `postgres:16` container and
  passed all 10 scenarios; quality commands are green; recorded in `docs/evidence/2026-11-01_ci.md`.

Remaining layers are filled in as they close. Final sign-off is in `docs/release-readiness.md`.
