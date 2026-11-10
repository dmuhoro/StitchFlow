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

## Blocked on credentials / authorization

- [ ] **Live backup/restore** — needs `SOURCE_DB_URL` and the production database password. Neither
  was supplied; no production database was accessed.
- [ ] **Hosted E2E and current deployment** — requires owner approval and authorization to publish
  the reviewed source. The owner reports the deployed bundle `index-BPtRE36V.js` predates
  `bb751ad`; this was not independently revalidated here. See
  [`docs/evidence/2026-11-09_preview-deploy-blocked.md`](docs/evidence/2026-11-09_preview-deploy-blocked.md)
  and [issue #6](https://github.com/dmuhoro/StitchFlow/issues/6).
## Blocked on plan tier

- [ ] **Commercial pilot** — Vercel project `stitchflow` is on Hobby, which forbids commercial use.
  Owner must upgrade to Pro before a paid pilot.

## Remaining owner decisions

- [ ] **Regional availability** — the project runs in one region (`iad1`) with no failover; do not
  promise uptime beyond that architecture. Multi-region failover is deferred to v2, not a blocker
  for the supervised one-atelier pilot.
- [ ] **Payment and messaging integrations** — credentials and approval are not present; these are
  outside the supervised pilot.
