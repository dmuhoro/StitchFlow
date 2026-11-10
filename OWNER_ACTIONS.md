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
- [x] **Negative controls** — eleven artifact, browser, published-secret, precondition, and
  malformed-command controls reject their
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
  No new booking was confirmed in the separate booking attempt.

## Blocked on credentials / authorization

- [ ] **Live backup/restore** — the direct host is unreachable over IPv6; the Session pooler endpoint
  is reachable, but the latest rehearsal probe rejected authentication (exit 2). Verify the
  Dashboard-generated Session pooler username and current database password; reset the password if
  needed. Run `npm run ops:set-source-db` by itself and paste the full URI at the hidden prompt,
  then rerun `npm run rehearse:restore:hosted`. No source dump or write occurred.

## Blocked on hosted booking retry authorization

- [ ] **Hosted booking confirmation** — the owner-approved, exact synthetic fixture reset succeeded:
  the owner-scoped `cancel_booking` operation left the request pending and its linked booking
  cancelled. The one authorized browser attempt exited 1 before a slot hold because the ignored
  `.env.pilot` still specifies the stale date `2026-11-09` (current computed date: `2026-11-13`).
  Clear the override and authorize one more attempt; it may create a synthetic confirmed booking.
  Do not run the broad `npm run seed:pilot` command against production.

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
