# Releases

> Release notes for StitchFlow. Linked from [`../../CHANGELOG.md`](../../CHANGELOG.md).

## Current release

| Release | Date | Status | Notes |
|---------|------|--------|-------|
| v1.0.1 | 2026-11-05 | Sprint 0 audit | Audit, 12-scenario RLS, proposed ADRs, dependency cleanup; no feature code |
| v1.0.0 | 2026-11-01 | Launch readiness (demo-first) | Reproducible schema, proven RLS, wired persistence, CI, release; P0s found later |

## Convention

- Each release has `RELEASE_<version>_NOTES.md` with capabilities, resolved blockers, known limits,
  and evidence references.
- A release note never claims a live verification that did not happen.
- Deployment status is stated explicitly, including a BLOCKED owner when authorization is missing.
