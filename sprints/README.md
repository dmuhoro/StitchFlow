# Sprint Records

- [Sprint 3.6 — Live-pilot booking integration checkpoint](sprint-03.6-live-pilot-integration.md)
- [Sprint 3.7 — Supervised pilot hardening](sprint-03.7-supervised-pilot.md)
- [Sprint 3.8 — Vercel pilot deployment readiness](sprint-03.8-vercel-pilot-deployment-readiness.md)
- [Sprint 3.9 — Hermetic E2E and restore harness](sprint-03.9-e2e-backup-restore-harness.md)

> One record per layer of work. A sprint record states what was planned, what shipped, what was
> proven, and what remains. It is not a marketing document.

## Convention

- File: `sprint-NN-kebab-title.md`.
- Status: `PLANNED`, `IN PROGRESS`, `DONE`, or `BLOCKED`.
- Every "shipped" claim cites a commit or a file.
- Every "proven" claim cites a command, test, or evidence file.
- Remaining work is listed explicitly; silence is not "done".

## Index

| Sprint | Title | Status |
|--------|-------|--------|
| [00](sprint-00-operating-scaffold.md) | Operating scaffold | DONE |
| [01](sprint-01-launch-readiness.md) | Launch readiness v1.0.0 | DONE — demo-first release |
| [00a](sprint-00a-verify-and-decide.md) | Verify and decide (audit) | DONE — Sprint 1 BLOCKED on ADR approval |
| [01a](sprint-01-real-data-real-auth.md) | Real data / real auth | IN PROGRESS |
| [03](sprint-03-booking-engine-db.md) | Booking engine, database layer | DONE — v1.2.0 |
| [03.6](sprint-03.6-live-pilot-integration.md) | Live-pilot booking integration checkpoint | IN PROGRESS — v1.4.0-rc.1 |
| [03.7](sprint-03.7-supervised-pilot.md) | Supervised pilot hardening | Hosted deployment and three read-only roles PASS; booking fixture and live restore BLOCKED |
| [03.8](sprint-03.8-vercel-pilot-deployment-readiness.md) | Vercel pilot deployment readiness | Deployment and three read-only roles PASS; booking fixture and live restore BLOCKED |
| [03.9](sprint-03.9-e2e-backup-restore-harness.md) | Hermetic E2E and restore harness | Local harness and CI PASS; hosted booking fixture and live restore BLOCKED |
