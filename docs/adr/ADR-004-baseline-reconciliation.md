# ADR-004 — Reconcile the legacy baseline with a guarded migration

**Status:** Accepted
**Date:** 2026-11-01

## Context

`001_initial_schema.sql` describes `profiles`, `order_number`, `feedbacks`, and `published`. Later
migrations and the client query `members`, `order_code`, `feedback`, and `is_published`, plus helper
functions that were applied out-of-band to the hosted project and never committed. The tracked chain
therefore could not rebuild the schema the client actually uses.

## Decision

Insert `20261031110000_baseline_reconciliation.sql` between the baseline and the hardening pass. It
renames and adds columns with existence guards so it converges both a fresh `001` database and a
hosted database that already has the reconciled shape. It also installs the helper functions the
later migrations expect.

Editing `001` was rejected because it may already be applied remotely and because history should show
what actually happened.

## Consequences

- The full chain now replays on an empty database, proven by `npm run verify:db`.
- The reconciliation is idempotent; running it against the hosted project is safe.
- The chain has a visible historical seam: `001` is legacy, `rls_final` is authoritative.
- Future schema changes must be new forward-only migrations, never edits to `001` or the
  reconciliation.

## Alternatives considered

- **Rewrite `001` to the final shape:** erases history and diverges from the hosted project. Rejected.
- **Squash to a single baseline:** clean for a greenfield project, but unsafe while a hosted database
  may hold data. Rejected.
- **Leave the chain broken and document the manual steps:** makes the repository non-reproducible.
  Rejected.
