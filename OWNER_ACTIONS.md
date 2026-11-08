# Owner Actions Before Pilot

Do not open StitchFlow to real pilot data until the remaining actions below are verified and
recorded in the evidence log.

- [ ] **Backup & restore rehearsal** — not performed. Complete the disposable-project rehearsal
  using the approved data-handling procedure and record restore/RLS results.
- [x] **Remote migration audit** — read-only audit performed on 2026-11-08 with
  `CI=1 supabase migration list --remote`. Production is at `20261107220000`; local migration
  `20261108173000_audit_order_financials.sql` is missing remotely. Follow-up is tracked in issue
  [#5](https://github.com/dmuhoro/StitchFlow/issues/5); the migration has not been applied.
- [ ] **Apply and verify the financial-audit migration** — review and apply the forward-only
  migration, then verify the hosted owner/staff/patron audit boundary.
- [ ] **Configure and publish Vercel** — set production Supabase browser variables and auth
  redirects, publish, and record the verified production URL and artifact target.
- [ ] **Verify live journeys** — run owner, employee, patron, and protected booking flows against
  the published URL using an approved synthetic fixture. Capture evidence without exposing
  credentials or customer data.
- [ ] **Rotate exposed owner credential** — the owner password was included in a chat message;
  rotate it before further hosted authentication and update the secret store.
