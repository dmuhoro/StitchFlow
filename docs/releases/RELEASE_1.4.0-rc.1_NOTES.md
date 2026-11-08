# StitchFlow v1.4.0-rc.1

**Status:** prerelease checkpoint; not ready for live booking pilot.

This checkpoint captures the owner-facing booking workflow, protected appointment status
transitions, fail-closed guest request behavior, and currency-accurate order terms.

## Included

- Owner setup and booking flow using availability, hold, confirm, and cancel RPCs.
- Database guard that prevents confirmation without a protected booking and synchronizes request
  status from booking transitions.
- Patron requests can only be inserted as pending, own-atelier requests without a staff assignment.
- Production visitor booking remains disabled until rate limiting and bot protection exist.
- Hosted role and booking browser tests are available as opt-in journeys.
- Production deploy builds fail if configured for demo mode or placeholder Supabase values.

## Verification and open gates

Local lint, builds, documentation links, database RLS/booking suites, and concurrency proof passed.
The connected production project is missing booking schema and contains remote migration
`20261106122030` without a matching local file. No migration was applied. Reconcile that history,
apply migrations, and run hosted owner/employee/patron and booking browser journeys before promoting
to a stable release or using live booking.

See [`pilot readiness evidence`](../evidence/2026-11-08_v1.4.0-rc.1.md) and
[`release gates`](../release-readiness.md).
