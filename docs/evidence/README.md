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
| 2026-11-07 | Sprint 3 booking-engine database layer | `2026-11-07-booking-engine.md` | PASS (local + CI) |
| 2026-11-07 | Live-data pilot readiness | `2026-11-07-pilot-readiness.md` | Local PASS; production BLOCKED |
| 2026-11-08 | v1.4.0-rc.1 release checkpoint | `2026-11-08_v1.4.0-rc.1.md` | Prerelease; production pilot BLOCKED |
| 2026-11-08 | v1.4.0-rc.2 hosted repair | `2026-11-08_v1.4.0-rc.2-hosted-repair.md` | Hosted schema parity PASS; artifact gate PASS; live publish BLOCKED on Netlify credits; browser journeys BLOCKED on identities |
| 2026-11-08 | Milestone 1 pilot hardening | `2026-11-08_milestone-1-pilot-hardening.md` | Local tenant/database/unit checks PASS; source lint/build, current live publish, hosted browser flows, and restore rehearsal BLOCKED |
| 2026-11-08 | Vercel pilot deployment readiness | `2026-11-08_vercel-pilot-readiness.md` | Vercel config, local build, unit/database checks, browser smoke and production fail-closed proof PASS; live deployment and restore rehearsal BLOCKED |
| 2026-11-08 | v1.4.0-rc.3 hosted recovery attempt | `2026-11-08_v1.4.0-rc.3-hosted-recovery.md` | Migration applied and hosted rollback proof PASS; remote E2E 1/6; backup/restore and release BLOCKED |
| 2026-11-08 | Pilot release execution | `2026-11-08_pilot-release-execution.md` | Step 1 PASS; production migration current through `20261108173000`; remaining steps not run yet |
| 2026-11-08 | Local Vercel preview / E2E attempt | `2026-11-08_pilot-e2e-failure.md` | BLOCKED before E2E; installed Vercel CLI has no `preview` command |
| 2026-11-09 | Vercel preview deployment attempt | `2026-11-09_preview-deploy-blocked.md` | Branch push PASS; production-target build cannot be deployed as preview; stopped at Step 2 |
| 2026-11-09 | Hermetic E2E and restore-verification harness | `2026-11-09_e2e-harness.md` | Local E2E PASS (6/6 twice); 7/7 negative controls PASS; truncated dump rejected and full local restore PASS; live restore, deploy and remote CI BLOCKED |
| 2026-11-10 | Pilot gate reconciliation | `2026-11-10_pilot-gate-reconciliation.md` | Local gates, corrected push/PR CI, approved hosted deployment, three read-only roles, and one hosted booking journey PASS; live restore BLOCKED |
| 2026-11-10 | Published-secret boundary | `2026-11-10_bundle-secret-boundary.md` | Guard PASS (build refusal, artifact gate, preflight, 9/9 controls); no evidence of publication; credential rotation PENDING |
| 2026-11-10 | Hosted rehearsal precondition classification | `2026-11-10_hosted-rehearsal-precondition.md` | Direct host IPv6-unreachable; Session pooler reachable but authentication rejected (exit 2 before dump); local restore PASS |
| 2026-11-10 | Credential-free local gate rerun | `2026-11-10_local-gate-rerun.md` | Build, lint, unit, DB, hermetic E2E, 11/11 controls, docs, and local restore PASS; live restore BLOCKED on IPv6 route |
| 2026-11-10 | Local gate rerun | `2026-11-10_local-gate-rerun.md` | Lint, unit, docs, DB, hermetic E2E, controls, loopback build and local restore PASS; default build and hosted restore BLOCKED on environment and network preconditions |
| 2026-11-13 | Node.js version contract and Vercel runtime alignment | `2026-11-13_node-version-contract.md` | Declared and Vercel-applied versions aligned on major 22 with a drifting declaration rejected by a guard (14/14 controls); local production-target build PASS; remote source build NOT PROVEN |
| 2026-11-13 | Observability seam: funnel events and crash reporting | `2026-11-13_observability-seam.md` | Redacted, allowlisted telemetry wired at four real boundaries and unit-proven (21 tests); Web Analytics configured; page views armed but not live; custom events BLOCKED on Hobby |
| 2026-11-13 | Live-restore source verified at credential save | `2026-11-13_source-db-setup-probe.md` | Setter probes read-only and exits 2 with the remedy when the source is unusable; write path unchanged; live restore still BLOCKED on the owner credential |
| 2026-11-08 | Live booking attempt | `booking-flow.md` | BLOCKED; remote UI mismatch prevented booking; no screenshot or booking confirmation |

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
