# Owner Actions Before Pilot

Do not open StitchFlow to real pilot data until each remaining item is verified and recorded in the
evidence log.

## Verified locally

- [x] **Hermetic E2E** — six journeys pass on a disposable local Supabase stack, both on a clean run
  and immediate re-run. `npm run seed:pilot-fitting` rebuilds the pending request for each run.
- [x] **Negative controls** — seven artifact and browser controls reject their deliberately bad
  inputs, including demo-mode production artifact rejection.
- [x] **Local backup/restore** — a truncated local dump is rejected (exit 1), then a complete local
  dump is restored and the RLS isolation suite passes (exit 0).
- [x] **Local engineering gates** — `npm run lint`, `npm run test:unit`, `npm run build`,
  `npm run verify:db`, and `npm run check:docs`; exact results are in
  [`docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](docs/evidence/2026-11-10_pilot-gate-reconciliation.md).
- [x] **Remote migration audit and financial-audit migration** — historical remote verification
  through `20261108173000` is recorded in
  [`docs/evidence/2026-11-08_pilot-release-execution.md`](docs/evidence/2026-11-08_pilot-release-execution.md).
- [x] **Owner credential rotation** — owner confirmed rotation of the previously exposed password.
  No live credential is stored in this repository.

## Verified in GitHub Actions

- [x] **Branch push and pull-request CI** — all three jobs passed for `ac22102`:
  [push run](https://github.com/dmuhoro/StitchFlow/actions/runs/42756978325) and
  [PR run](https://github.com/dmuhoro/StitchFlow/actions/runs/42756984649).

## Verified on the hosted deployment

- [x] **Approved Vercel deployment** — deployment `dpl_3psUv1F9c9Gq9FqKLx8bkdRXyp13` is READY at
  `https://stitchflow-coral.vercel.app`; HTTP HEAD returned 200.
- [x] **Owner, employee, and patron roles** — 3/3 read-only journeys pass against that deployment.
  No hosted booking was created.

## Blocked on credentials / authorization

- [ ] **Live backup/restore** — needs `SOURCE_DB_URL` and the production database password. Neither
  was supplied; no live-source dump or restore was performed.

## Blocked on fixture approval

- [ ] **Hosted booking confirmation** — the guarded check did not find exactly one pending
  script-owned synthetic fitting. No fixture reset, hold, or booking write occurred. Authorize a
  narrowly scoped reset/recreation of that fixture before the previously approved synthetic
  confirmation; do not run the broad `npm run seed:pilot` command against production.

## Blocked on source-build parity

- [ ] **Vercel Node.js alignment** — `.nvmrc` specifies Node.js 20, while Vercel project settings
  reported 26.x and the successful prebuilt deployment used 22.22.1. Align the project and verify a
  Vercel source-build before relying on remote build parity.

## Blocked on plan tier

- [ ] **Commercial pilot** — Vercel project `stitchflow` is on Hobby, which forbids commercial use.
  Upgrade to Pro before a paid pilot; the selected non-commercial supervised pilot is not blocked.

## Remaining owner decisions

- [ ] **Regional availability** — the project runs in one region (`iad1`) with no failover; do not
  promise uptime beyond that architecture. Multi-region failover is deferred to v2, not a blocker
  for the supervised one-atelier pilot.
- [ ] **Payment and messaging integrations** — credentials and approval are not present; these are
  outside the supervised pilot.
