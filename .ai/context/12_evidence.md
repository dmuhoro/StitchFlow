# Evidence Brief

> Canonical: `docs/evidence/README.md`.

## Location and naming

`docs/evidence/YYYY-MM-DD_<topic>.md`. One file per verification topic. Raw command output may also
be `.log`.

## Required sections

```markdown
# <Date> — <Topic>

## Command / Step
<exact command or manual step>

## Observed Result
<output excerpt, exit code, screenshot reference>

## Verdict
PASS / FAIL / BLOCKED
```

## Rules

1. A PASS cites the command or test that produced it. Narrative alone is not evidence.
2. Secrets are redacted as `***REDACTED***` before saving. Never commit a live credential.
3. A BLOCKED verdict names the human owner and the exact authorization needed.
4. Update the index in `docs/evidence/README.md` in the same commit.

## Current evidence set

| Topic | File | Verdict |
|-------|------|---------|
| Database migration chain + RLS | `2026-11-01_database_chain.md` | PASS (10 scenarios at the time) |
| Build artifacts and bundle assertions | `2026-11-01_build_artifacts.md` | PASS for paths/assets; not a demo-code absence proof |
| Persistence and fail-closed access | `2026-11-01_persistence.md` | PASS (runtime guards, not artifact cleanliness) |
| CI gate | `2026-11-01_ci.md` | PASS |
| Release and tag | `2026-11-01_release.md` | PASS |
| Deployment | `2026-11-01_deployment.md` | PASS (deploy only; artifact later found to contain demo code) |
| Sprint 0 eight-gate verification | `2026-11-05_sprint-0-verification.md` | 7 PASS / 1 FAIL |
| Live-data pilot readiness | `2026-11-07-pilot-readiness.md` | Local PASS; production later repaired in rc.2 |
| v1.4.0-rc.1 release checkpoint | `2026-11-08_v1.4.0-rc.1.md` | Prerelease; production schema was still missing |
| v1.4.0-rc.2 hosted repair | `2026-11-08_v1.4.0-rc.2-hosted-repair.md` | Hosted schema parity PASS; artifact gate PASS; live publish BLOCKED on Netlify credits; browser journeys BLOCKED on identities |
| Milestone 1 pilot hardening | `2026-11-08_milestone-1-pilot-hardening.md` | Local tenant/database/unit checks and fresh-artifact hosted journeys PASS; live publish and restore rehearsal BLOCKED |
| Vercel pilot readiness | `2026-11-08_vercel-pilot-readiness.md` | Static Vercel config, local financial audit/RLS proof, build and browser smoke PASS; new migration apply, live deployment, live journeys, and restore rehearsal BLOCKED |
| v1.4.0-rc.3 hosted recovery attempt | `2026-11-08_v1.4.0-rc.3-hosted-recovery.md` | Migration applied and hosted rollback proof PASS; remote E2E 1/6; backup/restore and release BLOCKED |
| Hermetic E2E and restore harness | `2026-11-09_e2e-harness.md` | Local 6/6 journeys twice, 7/7 negative controls, truncated dump rejected and full 16-table restore/RLS PASS; live restore, deploy and remote CI BLOCKED |
| Live booking attempt | `booking-flow.md` | BLOCKED; remote UI mismatch prevented booking; no screenshot or confirmation |
