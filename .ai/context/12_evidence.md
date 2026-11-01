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

## Evidence required at v1.0.0

| Topic | File | Status |
|-------|------|--------|
| Database migration chain + RLS | `2026-11-01_database_chain.md` | PENDING |
| Build artifacts and bundle assertions | `2026-11-01_build_artifacts.md` | PENDING |
| Release tagging | `2026-11-01_release.md` | PENDING |
| Deployment | `2026-11-01_deployment.md` | BLOCKED — owner authorization |
