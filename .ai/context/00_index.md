# StitchFlow AI Context Index

> Machine-readable context for agents working in this repository.
> Each numbered file is a self-contained brief. Read `00_index.md` first, then the files relevant to
> the task. Summaries are checked against source; `docs/` remains the canonical truth.

## Files

| # | File | Purpose |
|---|------|---------|
| 00 | `00_index.md` | This file. Navigation map and boot sequence. |
| 01 | `01_architecture.md` | Stack, request lifecycle, module map, build and deploy. |
| 02 | `02_system-map.md` | File locations and where each concern lives. |
| 03 | `03_domain-model.md` | Ateliers, members, orders, measurements, money, cultural fields. |
| 04 | `04_code-standards.md` | TypeScript, React, repository, SQL and test conventions. |
| 05 | `05_db-contracts.md` | Table contracts, RLS ownership, writers, coupling risks. |
| 06 | `06_decisions.md` | Decision log mapped to ADRs. |
| 07 | `07_release-readiness.md` | Go/no-go gates and the launch task list. |
| 08 | `08_security.md` | Auth model, tenant invariants, anonymous perimeter. |
| 09 | `09_data-persistence.md` | Demo mode vs Supabase mode, write paths, fail-closed rules. |
| 10 | `10_roadmap.md` | Current layer, next layers, completion criteria. |
| 11 | `11_workflow-rules.md` | The Constitution and AGENTS.md condensed. |
| 12 | `12_evidence.md` | Evidence format, index and recording rule. |

## Canonical source

The single source of truth is `docs/` at the repository root. `.ai/context/` files are summaries
plus pointers, never standalone truth. If a summary contradicts `docs/`, the `docs/` file wins and
the summary must be corrected in the same change.

## Agent boot sequence

1. Read `00_index.md` (this file).
2. Read `11_workflow-rules.md` — the rules that govern how you may act.
3. Read `01_architecture.md` and `02_system-map.md` — where things are.
4. Read `docs/current-state.md` — what is true today.
5. For the task, read the relevant domain file (03, 05, 08, 09).
6. Before touching tenant scoping or money, re-read the invariants in `08_security.md`.
7. Before claiming completion, record evidence per `12_evidence.md`.
