# Owner Actions Before Pilot

Do not open StitchFlow to real pilot data until the remaining actions below are verified and
recorded in the evidence log.

- [ ] **Backup & restore rehearsal** — not performed. `supabase start` could not fetch required
  Docker images (TLS/network timeouts), and default Supabase ports are occupied by another local
  stack. Retry in an approved isolated environment; no production dump or restore was made.
- [x] **Remote migration audit** — read-only audit performed on 2026-11-08 with
  `CI=1 supabase migration list --remote`; reverified in
  [`docs/evidence/2026-11-08_pilot-release-execution.md`](docs/evidence/2026-11-08_pilot-release-execution.md).
  Production and local histories match through `20261108173000`.
- [x] **Apply the financial-audit migration** — `CI=1 supabase db push --remote --yes` applied it;
  the subsequent remote migration list matched local and `CI=1 supabase db push --dry-run --remote`
  returned up to date. The rollback-only hosted RLS proof passed. The trigger-specific actor and
  before/after assertions passed in local `npm run verify:db`.
- [ ] **Refresh and verify Vercel deployment** — branch push succeeded, but no preview was created:
  the production-target artifact from `vercel build --prod` was rejected by the preview deploy
  command. Resolve the build/deploy target mismatch without promoting to production; see
  [`docs/evidence/2026-11-09_preview-deploy-blocked.md`](docs/evidence/2026-11-09_preview-deploy-blocked.md)
  and [issue #6](https://github.com/dmuhoro/StitchFlow/issues/6).
- [ ] **Verify live journeys** — remote E2E returned 1 pass and 5 failures. No booking was confirmed;
  rerun owner, employee, patron, invite and booking flows after deploying the reviewed source with
  approved synthetic fixtures. Track in [issue #6](https://github.com/dmuhoro/StitchFlow/issues/6).
- [x] **Owner credential rotation** — owner confirms the previously exposed password was rotated.
  No credential is stored in this repository.
- [ ] **Push branch and open review PR** — push was rejected because the GitHub OAuth App lacks
  `workflow` scope for `.github/workflows/ci.yml`. No PR or release tag exists.
