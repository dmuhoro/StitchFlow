# StitchFlow Documentation

> Canonical documentation for the StitchFlow atelier operating surface.
> `.ai/context/` holds agent-oriented summaries; `docs/` is the source of truth.

## Start here

| Document | Read it when |
|----------|--------------|
| [`current-state.md`](current-state.md) | You need to know what is actually shipped today |
| [`architecture.md`](architecture.md) | You need to locate a change |
| [`code-standards.md`](code-standards.md) | You are writing code |
| [`db-contracts.md`](db-contracts.md) | You touch a table, policy, or money field |
| [`security.md`](security.md) | You touch auth, tenant scoping, or secrets |
| [`release-readiness.md`](release-readiness.md) | You are deciding whether to ship |
| [`roadmap.md`](roadmap.md) | You are planning the next layer |

## Governance

- [`engineering/CONSTITUTION.md`](engineering/CONSTITUTION.md) — supreme engineering rules.
- [`adr/`](adr/README.md) — architectural decisions, newest at the bottom.
- [`../AGENTS.md`](../AGENTS.md) — rules every agent follows.
- [`../SECURITY.md`](../SECURITY.md) — vulnerability reporting and security model.

## Operations

- [`runbooks/deployment.md`](runbooks/deployment.md) — Netlify + Supabase release procedure.
- [`runbooks/local-database-verification.md`](runbooks/local-database-verification.md) — reproducible
  migration and RLS check.
- [`runbooks/rollback.md`](runbooks/rollback.md) — how to back out a bad release.

## Records

- [`evidence/`](evidence/README.md) — dated verification with commands and verdicts.
- [`releases/`](releases/README.md) — release notes.
- [`../sprints/`](../sprints/README.md) — sprint records, one per layer of work.

## The rule

A document that describes behaviour the code does not have is a shipped defect. Update docs in the
same commit as the code, and correct the `.ai/context` summary alongside.
