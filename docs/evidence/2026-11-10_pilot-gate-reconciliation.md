# 2026-11-10 — Pilot gate reconciliation

## Scope and safety boundary

This work corrected a CI context mismatch and reconciled the release-readiness record. It did not
push, deploy, access the hosted Supabase project, create a hosted booking, or perform a live
backup. All database and browser checks used disposable local containers and synthetic fixtures.

## Existing remote CI result

Commands:

```sh
gh run list --branch sprint-3/booking-staff-slice --limit 10
gh run view 42625315493 --json name,headSha,headBranch,event,status,conclusion,jobs,url
gh run view 42625323458 --json name,headSha,headBranch,event,status,conclusion,jobs,url
```

Each command exited **0**. Both the push and pull-request runs for `6f64cbd` concluded **failure**:

- `Migration chain and RLS`: passed.
- `Hermetic browser journey`: passed, including both clean and immediate rerun.
- `Types, docs and bundle`: failed at `Public-entry browser smoke test`.

The failing test expected the production landing-page button `Atelier sign in`; the quality job had
built a demo artifact, which renders the demo portfolio. The same public-entry test is included in
the hermetic job, where it runs against the intended Supabase-mode artifact.

## Reproduction and correction

Commands and observed exits:

```sh
VITE_DATA_MODE=demo npm run build
```

Exit **0**.

```sh
npm run test:e2e -- --grep "public entry renders"
```

Exit **1**, as expected for this mismatched build context: `Atelier sign in` was absent from the demo
portfolio. The assertion was not weakened. `.github/workflows/ci.yml` no longer runs this
production-landing test after the demo build; the complete hermetic browser job still runs it
against the correct Supabase-mode artifact.

## Local verification

| Command | Exit | Observed result |
|---|---:|---|
| `npm run test:e2e:hermetic` | 0 | All 6 browser journeys passed, including the public entry, owner, employee, patron, invitation, and protected booking flows. |
| `npm run lint` | 0 | TypeScript check passed. |
| `npm run test:unit` | 0 | 2 files, 7 tests passed. |
| `VITE_DATA_MODE=demo VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npm run build` | 0 | Credential-free demo build and artifact gate passed. |
| `npm run check:docs` | 0 | 161 relative Markdown links resolved across 104 files. |
| `npm run verify:db` | 0 | Migration/RLS/booking suites passed; 200 attempts yielded 1 success, 199 `slot_unavailable`, and no duplicate. |
| `npm run verify:controls` | 0 | All 7 negative controls fired; expected negative cases exited 1. |
| `npm run rehearse:restore` | 0 | Truncated, missing-table, and unreplayable dumps were each rejected with exit 1; full local restore matched all 16 data-table counts and passed the restored-database RLS suite. |

These results are local and are separate from the remote CI runs recorded next.

## Corrected remote CI result

Commands:

```sh
gh run view 42756978325 --json name,headSha,headBranch,event,status,conclusion,jobs,url
gh run view 42756984649 --json name,headSha,headBranch,event,status,conclusion,jobs,url
```

Both commands exited **0**. Push run [42756978325](https://github.com/dmuhoro/StitchFlow/actions/runs/42756978325)
and pull-request run [42756984649](https://github.com/dmuhoro/StitchFlow/actions/runs/42756984649)
passed all three jobs: types/docs/bundle, migration/RLS, and hermetic browser journey (including the
clean run, immediate rerun, and negative controls). The tested head was `ac2210256c5105c020121d782e3c10aa05c5c298`.

## Remaining owner-controlled gates

| Item | Status | Exact next requirement |
|---|---|---|
| Hosted build and supervised pilot walkthrough | **BLOCKED** | Repository owner must approve publication of the reviewed source and confirm the intended Vercel project/domain. Then run the role journeys and a synthetic booking workflow against that deployment. |
| Live backup/restore rehearsal | **BLOCKED** | Requires `SOURCE_DB_URL` and the production database password through an approved secret channel. Neither was supplied or used. |
| Commercial pilot | **BLOCKED** | Vercel Hobby does not permit commercial use; repository owner must upgrade to Pro or decide not to run a paid pilot. |

No hosted or production claim is made by this evidence.
