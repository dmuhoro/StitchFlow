# Evidence Log

> Dated verification records. A PASS cites a command, test, or manual step. Narrative alone is not
> evidence (Constitution Article VI).

## Index

| Date | Topic | File | Verdict |
|------|-------|------|---------|
| 2026-11-01 | Database migration chain and RLS | `2026-11-01_database_chain.md` | PASS |
| 2026-11-01 | Build artifacts and bundle assertions | `2026-11-01_build_artifacts.md` | PASS |
| 2026-11-01 | Persistence and fail-closed access | `2026-11-01_persistence.md` | PASS |
| 2026-11-01 | Continuous integration gate | `2026-11-01_ci.md` | PASS |
| 2026-11-01 | Release and tag | `2026-11-01_release.md` | PASS |
| 2026-11-01 | Deployment | `2026-11-01_deployment.md` | PASS (deploy only; artifact content later found defective) |
| 2026-11-05 | Sprint 0 eight-gate verification | `2026-11-05_sprint-0-verification.md` | 7 PASS / 1 FAIL |
| 2026-11-07 | Sprint 3 booking-engine baseline | `2026-11-07-baseline.md` | PASS |
| 2026-11-07 | Sprint 3 booking-engine database layer | `2026-11-07-booking-engine.md` | PASS (local); CI tracked in file |

## Format

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

1. Redact any credential as `***REDACTED***` before saving.
2. Record the actual command and the actual result. No post-hoc embellishment.
3. A BLOCKED verdict names the human owner and the exact authorization needed.
4. Update this index in the same commit as the evidence file.
