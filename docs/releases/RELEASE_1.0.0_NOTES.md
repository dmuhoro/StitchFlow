# Release 1.0.0 — StitchFlow (2026-11-01)

## Capabilities shipped

- Reproducible migration chain from an empty Postgres database (`supabase/migrations/`,
  `scripts/verify-db.sh`), with seed data in `supabase/seed.sql`.
- Tenant isolation proven by `supabase/tests/rls_isolation_test.sql` (10 scenarios + structural
  assertions, every public table RLS-enabled).
- Persistence wired for feedback resolution, lookbook publish toggle, and atelier settings; Supabase
  mode fails closed when unconfigured.
- Cultural imagery bundled locally through Vite with content-hashed URLs.
- CI gate `.github/workflows/ci.yml` (quality + database jobs).
- Public read path for published lookbook and atelier profile, anonymous booking RPC path.

## Resolved blockers

- L1 migration chain from empty (evidence `docs/evidence/2026-11-01_database_chain.md`).
- L2 RLS isolation suite (same evidence).
- L3 bundle assertions (evidence `docs/evidence/2026-11-01_build_artifacts.md`).
- L4 persistence and fail-closed access (evidence `docs/evidence/2026-11-01_persistence.md`).
- L5 CI gate (evidence `docs/evidence/2026-11-01_ci.md`).

## Known limits

- L6 Release: local version and tag; push requires git remote credentials (available); deployment
  verified separately (L9).
- L7 Cleanup: tree currently carries one untracked file (`setup_stitchflow.sh`) pending L7 disposal.
- L8 README/docs: README updated in release commit.
- L9 Deployment verification is BLOCKED on Netlify authorization (owner pending).
- Demo mode remains default (`VITE_DATA_MODE=demo`); Supabase mode requires env vars and fails
  closed otherwise.

## Evidence

- `docs/evidence/2026-11-01_database_chain.md`
- `docs/evidence/2026-11-01_build_artifacts.md`
- `docs/evidence/2026-11-01_persistence.md`
- `docs/evidence/2026-11-01_ci.md`
