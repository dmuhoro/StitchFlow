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
| Live-data pilot readiness | `2026-11-07-pilot-readiness.md` | Local PASS; production BLOCKED by remote migration-history drift and absent booking schema |
| v1.4.0-rc.1 release checkpoint | `2026-11-08_v1.4.0-rc.1.md` | Prerelease; production pilot BLOCKED |
