# Owner Actions Before Pilot

Do not open StitchFlow to real pilot data until each remaining item is verified and recorded in the
evidence log.

## P0 — rotate before anything else

- [ ] **Reset the Supabase database password.** It was found in `.env.local` as `VITE_SUPABASE_PASSWORD`
  (a `VITE_` prefix means Vite would publish it) and in a session terminal. Evidence and blast-radius
  checks: [`docs/evidence/2026-11-10_bundle-secret-boundary.md`](docs/evidence/2026-11-10_bundle-secret-boundary.md).
  Supabase → Project Settings → Database → Reset database password.
- [ ] **Revoke the Supabase personal access token.** It was found in `.env.local` as
  `VITE_SUPABASE_PERSONAL_ACCESS_TOKEN`; it is account-level, so it is broader than the database.
  Supabase → Account → Access Tokens → Revoke.
- [ ] **Set a valid Session-pooler connection** with `npm run ops:set-source-db` (run by itself,
  then paste only the Dashboard-generated Session pooler URI at the hidden prompt). The pooler host
  was reachable, but Supabase rejected the supplied authentication. Verify the exact pooler
  username and current database password; reset the database password if uncertain, then rerun the
  setter and `npm run rehearse:restore:hosted`. No dump or restore has run.

## Verified locally

- [x] **Hermetic E2E** — six journeys pass on a disposable local Supabase stack, both on a clean run
  and immediate re-run. `npm run seed:pilot-fitting` rebuilds the pending request for each run.
- [x] **Negative controls** — fourteen artifact, browser, published-secret, precondition, Node.js
  contract, and malformed-command controls reject their
  deliberately bad inputs, including demo-mode production artifact rejection and a build that sets a
  credential with a public prefix.
- [x] **Local backup/restore** — a truncated local dump is rejected (exit 1), then a complete local
  dump is restored and the RLS isolation suite passes (exit 0).
- [x] **Local engineering gates** — `npm run lint`, `npm run test:unit`, `npm run build`,
  `npm run verify:db`, and `npm run check:docs`; exact results are in
  [`docs/evidence/2026-11-10_local-gate-rerun.md`](docs/evidence/2026-11-10_local-gate-rerun.md).
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
- [x] **Synthetic booking confirmation** — the protected hosted flow passed 1/1 after the stale
  date override was cleared for the command. The script-owned request is now confirmed; one prior
  synthetic booking remains cancelled. See
  [`docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](docs/evidence/2026-11-10_pilot-gate-reconciliation.md).

## Blocked on credentials / authorization

- [ ] **Live backup/restore** — the direct host is unreachable over IPv6; the Session pooler endpoint
  is reachable, but the latest rehearsal probe rejected authentication (exit 2). Verify the
  Dashboard-generated Session pooler username and current database password; reset the password if
  needed. Run `npm run ops:set-source-db` by itself and paste the full URI at the hidden prompt,
  then rerun `npm run rehearse:restore:hosted`. No source dump or write occurred.

## Blocked on source-build parity

- [x] **Vercel Node.js alignment** — `.nvmrc` and `package.json#engines.node` now both declare major
  22, the Vercel project reports `Node.js Version 22.x`, and a production-target `vercel build`
  passes on that toolchain. `npm run check:node` fails on drift and CI enforces it in strict mode.
  See [`docs/evidence/2026-11-13_node-version-contract.md`](docs/evidence/2026-11-13_node-version-contract.md).
- [ ] **Remote source deploy** — `vercel build` runs on the local machine, so Vercel's own build
  runtime is still untested. Authorize one source deploy from the work branch (or after merge) and
  record its READY state to close the remote half.

## Blocked on plan tier

- [ ] **Commercial pilot** — Vercel project `stitchflow` is on Hobby, which forbids commercial use.
  Upgrade to Pro before a paid pilot; the selected non-commercial supervised pilot is not blocked.
- [ ] **Custom funnel and crash events** — `src/lib/telemetry.ts` emits four allowlisted events and
  the project has Web Analytics configured, but Vercel captures custom events only on Pro/Enterprise,
  so they are dropped on Hobby. Page views start with the next deploy. Upgrading to Pro for the
  commercial pilot also turns these events on; no code change is needed.

## Remaining owner decisions

- [ ] **Regional availability** — the project runs in one region (`iad1`) with no failover; do not
  promise uptime beyond that architecture. Multi-region failover is deferred to v2, not a blocker
  for the supervised one-atelier pilot.
- [ ] **Payment and messaging integrations** — credentials and approval are not present; these are
  outside the supervised pilot.
