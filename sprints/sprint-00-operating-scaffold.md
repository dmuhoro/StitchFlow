# Sprint 00 — Operating Scaffold

**Status:** DONE
**Date:** 2026-11-01

## Why

The repository had code and design briefs but no operating layer: no constitution, no ADRs, no
current-state document, no sprint records, no evidence log, no runbooks, and no agent context. Every
task therefore depended on conversation memory. That is not a maintainable way to ship a multi-tenant
product that holds patron measurements and money.

## What shipped

| Area | Files |
|------|-------|
| Agent rules | `AGENTS.md` |
| Contribution and security | `CONTRIBUTING.md`, `SECURITY.md`, `.nvmrc` |
| Agent context | `.ai/VERSION`, `.ai/context/00`–`12` |
| Agent roles | `.ai/agents/{builder,auditor,security,migration,release}-agent.md` |
| Constitution | `docs/engineering/CONSTITUTION.md` |
| Architecture and state | `docs/architecture.md`, `docs/current-state.md`, `docs/code-standards.md` |
| Data and security | `docs/db-contracts.md`, `docs/security.md` |
| Planning | `docs/release-readiness.md`, `docs/roadmap.md` |
| ADRs | `docs/adr/` (001–007) |
| Records | `docs/evidence/`, `docs/releases/`, `sprints/` |
| Runbooks | `docs/runbooks/{deployment,local-database-verification,rollback}.md` |
| Test map | `tests/README.md` |
| Scripts | `scripts/README.md`, `scripts/ci/check-doc-links.mjs`, `scripts/ci/verify-build.mjs` |

## Reference pattern

The structure follows the operating pattern already used in Daftari, TraderOS and Kay's Wellness
Centre: a supreme constitution, numbered agent context, ADR log, dated evidence, sprint records,
runbooks, and small CI guard scripts. StitchFlow keeps its own domain vocabulary rather than copying
theirs.

## Proof

```bash
npm run check:docs
```

Every relative Markdown link in the repository resolves. Reported in
`docs/evidence/2026-11-01_build_artifacts.md`.

## Remaining

None for this layer. The launch layers are tracked in
[`sprint-01`](sprint-01-launch-readiness.md) and `docs/release-readiness.md`.
