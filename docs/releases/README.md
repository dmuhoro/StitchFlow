# Releases

> Release notes for StitchFlow. Linked from [`../../CHANGELOG.md`](../../CHANGELOG.md).

## Current release

| Release | Date | Status | Notes |
|---------|------|--------|-------|
| v1.4.0-rc.1 | 2026-11-08 | Prerelease — hosted pilot blocked | Booking integration; [release note](RELEASE_1.4.0-rc.1_NOTES.md), [evidence](../evidence/2026-11-08_v1.4.0-rc.1.md) |
| v1.3.0 | 2026-11-07 | Released | Booking staff database slice and type exports; see `CHANGELOG.md` and `sprints/sprint-03.5-booking-staff-slice.md` |
| v1.2.0 | 2026-11-07 | Released | Booking engine database layer; see `CHANGELOG.md` and `sprints/sprint-03-booking-engine-db.md` |
| v1.1.0 | 2026-11-06 | Released | Real data and real auth foundation; see `CHANGELOG.md` and `docs/evidence/2026-11-06_sprint-1-verification.md` |
| v1.0.1 | 2026-11-05 | Sprint 0 audit | Audit, 12-scenario RLS, proposed ADRs, dependency cleanup; no feature code |
| v1.0.0 | 2026-11-01 | Launch readiness (demo-first) | Reproducible schema, proven RLS, wired persistence, CI, release; P0s found later |

## Convention

- Each release has `RELEASE_<version>_NOTES.md` with capabilities, resolved blockers, known limits,
  and evidence references.
- A release note never claims a live verification that did not happen.
- Deployment status is stated explicitly, including a BLOCKED owner when authorization is missing.
