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

No hosted or production claim is made by the CI-reconciliation work recorded above.

## Subsequent owner-approved deployment and hosted role verification

This follow-up records the later owner-approved publication and read-only hosted checks. It does
not change the scope or results of the earlier CI-reconciliation work above.

Commands and observed results:

```sh
vercel build --prod --yes
```

Exit **0**. The production artifact gate passed.

```sh
vercel deploy --prebuilt --prod --yes
```

Exit **0**. Vercel reported deployment `dpl_3psUv1F9c9Gq9FqKLx8bkdRXyp13` READY and aliased it to
`https://stitchflow-coral.vercel.app`.

```sh
curl --head --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://stitchflow-coral.vercel.app/
```

Exit **0**; HTTP status **200**.

```sh
STITCHFLOW_E2E_BASE_URL=https://stitchflow-coral.vercel.app \
STITCHFLOW_E2E_OWN_ORDER=PILOT-A-001 \
STITCHFLOW_E2E_FOREIGN_ORDER=PILOT-B-001 \
node scripts/e2e/env-run.mjs .env.pilot -- npx playwright test e2e/role-access.spec.ts --workers=1
```

Exit **0**; owner, employee, and patron read-only journeys passed **3/3**. The `.env.pilot` file
was consumed without printing or recording any credential value.

### Hosted booking boundary

The guarded fitting precondition did not find exactly one pending script-owned
`Ruracio bridal basted fitting` request. The seed check stopped before its conditional fixture-link
update; the booking journey stopped before holding or confirming a slot. No booking was created and
no production fixture was reset. The owner must authorize resetting only this synthetic fixture
before the approved one-time hosted confirmation.

### Remaining constraints

- A live backup/restore still requires `SOURCE_DB_URL` and the production database password through
  an approved secret channel. Neither was supplied or used.
- The successful prebuilt deployment used Node.js 22.22.1; Vercel reports Node.js 26.x while
  `.nvmrc` specifies 20. A remote source-build using the repository's Node version is not verified.
- The project is on Vercel Hobby. Pro is required before commercial use; the selected supervised
  pilot is non-commercial.

## Owner-approved synthetic booking reset and hosted confirmation

The repository owner authorized resetting only the script-owned synthetic fitting and making a
hosted booking confirmation attempt. After the first attempt exposed a stale private date override,
the owner authorized one corrected-date retry. No broad pilot seed, deployment, or live backup was
run.

Read-only precondition inspection exited **0** and found exactly one fitting scoped to the selected
atelier and `source=pilot`, linked to the expected patron, with status `confirmed`; exactly one
linked booking had status `confirmed` and matched the same tenant and patron.

The owner authenticated through PostgREST and called `cancel_booking` for that one verified
synthetic booking. The guarded operation exited **0**. Its post-check found the fitting `pending`
and the linked booking `cancelled`. The script-specific verifier then passed:

```sh
npm run seed:pilot-fitting
```

Exit **0**; the pending fitting was patron-linked and visible through patron RLS.

The first hosted Playwright attempt was:

```sh
set -a; . ./.env.pilot; set +a; STITCHFLOW_E2E_BASE_URL=https://stitchflow-coral.vercel.app npm run test:e2e -- --workers=1 e2e/booking-confirm.spec.ts
```

Exit **1** before a slot was selected or held. The expected `09:00` availability button did not
appear within 15 seconds because the private `.env.pilot` contained the non-secret override
`STITCHFLOW_E2E_BOOKING_DATE=2026-11-09`; the current fixture calculation for 2026-11-10 is
`2026-11-13`. A read-only post-check exited **0** and confirmed the fitting remained `pending` and
its only linked booking remained `cancelled`.

A read-only availability precheck exited **0** and confirmed the same pending fixture, its one
cancelled booking, the selected active resource, and a 09:00 slot on 2026-11-13. The corrected-date
retry cleared the stale override only for this process:

```sh
set -a; . ./.env.pilot; set +a; STITCHFLOW_E2E_BOOKING_DATE= STITCHFLOW_E2E_BASE_URL=https://stitchflow-coral.vercel.app npm run test:e2e -- --workers=1 e2e/booking-confirm.spec.ts
```

Exit **0**; the hosted booking confirmation journey passed **1/1**. The final owner-scoped
read-only post-check exited **0**: the fitting is `confirmed`, and its two linked synthetic booking
rows are one `cancelled` and one `confirmed`, with both rows matching the same tenant and patron.
The hosted booking gate is **PASS** for this one journey. The test fixture is now consumed; no
additional hosted booking test is authorized by this result. No production credential value is
recorded here.

## Hosted fixture configuration and final local verification

The pilot seed configuration now emits the same hosted order codes and fitting label consumed by
Playwright, defaults to the approved Vercel alias, and omits a fixed booking date. A regression test
covers these generated values. The provisioning script itself was not run against production.

| Command | Exit | Observed result |
|---|---:|---|
| `node --check scripts/ops/seed-pilot.mjs && node --check scripts/ops/pilot-e2e-config.mjs` | 0 | Pilot configuration scripts parse. |
| `npm run test:unit` | 0 | 2 test files, 9 tests passed. |
| `npm run lint` (first run) | 1 | Caught untyped callback parameters in the new helper; JSDoc types were added. |
| `npm run lint` (after fix) | 0 | TypeScript check passed. |
| `npm run build` | 0 | Production build and postbuild artifact gate passed; Vite emitted a non-failing large-chunk advisory. |
| `npm run check:docs` | 0 | 162 relative Markdown links resolved across 104 files. |
| `npm run verify:db` | 0 | Migration/RLS/booking checks passed; 200 attempts yielded 1 success, 199 `slot_unavailable`, and no duplicate. |
| `npm run test:e2e:hermetic` (run 1) | 0 | All 6 browser journeys passed after database reset and fixture reseed. |
| `npm run test:e2e:hermetic` (immediate rerun) | 0 | All 6 browser journeys passed again after a second reset and fixture reseed. |
| `npm run verify:controls` | 0 | All 7 controls fired; expected negative cases exited 1, including the demo-mode E2E and production artifact checks. |
| `npm run rehearse:restore` | 0 | Truncated, missing-table, and unreplayable dumps were rejected; all 16 restored row counts matched and RLS passed. |
| `git diff --check` | 0 | No whitespace errors. |
