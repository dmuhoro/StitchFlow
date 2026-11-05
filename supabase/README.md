# Supabase backend

The connected Supabase project is the relational backend for StitchFlow. Its project ref is
`vpathqzkaqdtbykumxeo` in `eu-central-1`.

The migration chain under `supabase/migrations/` is the source of truth for the schema. It contains:

- `ateliers` for tenant/workshop settings
- `members` linked to `auth.users` with owner, employee, and client roles
- `lookbook_items` for published and private atelier catalog entries
- `orders` and `order_progress_notes` for garment production
- `measurements` for standard and African garment-specific dimensions
- `appointments` for fitting requests and scheduled slots
- `feedback` for patron fit reviews and resolution state

All 9 tables have Row Level Security enabled. Staff access is tenant-scoped. Patrons can access only
records tied to their own member ID. Public lookbook access is limited to published entries.

**Not verified by the 2026-11-05 audit:** the hosted project's current schema, whether the latest
migrations are applied remotely, and the live Auth configuration. The local replay proves the chain;
it does not prove remote parity. Remote migration is owner-authorized work.

## Local configuration

Copy `.env.example` to `.env.local` and provide the Supabase project URL and publishable browser key.
Keep `VITE_DATA_MODE=demo` until the first owner account and atelier have been provisioned. Switch to
`supabase` only after Auth and the tenant bootstrap flow are verified.

Never put a service-role key in Vite environment variables or browser code.

## Verification gates — result on 2026-11-05

Run locally on a disposable `postgres:16` via `npm run verify:db`:

| # | Gate | Result |
|---|------|--------|
| 1 | An owner can sign in and read only their atelier | PASS |
| 2 | An employee cannot read another atelier's orders or measurements | PASS |
| 3 | A patron can read only their own order, appointment, and measurement records | PASS |
| 4 | An unauthenticated visitor can read only published lookbook entries | PASS |
| 5 | A patron cannot update an order, balance, or measurement | PASS |
| 6 | A staff member cannot change tenant IDs through an update payload | PASS |
| 7 | Deleted or inactive members lose access immediately | PASS |
| 8 | Appointment capacity and double-booking protection are enforced server-side | **FAIL** |

Gate 8 has no database enforcement: `exclusion_constraints=0`, and two overlapping pending rows for
the same tailor and instant are accepted. There is also no owner/employee `INSERT` policy on
`appointments`. The fix is scoped by [ADR-009](../docs/adr/ADR-009-booking-concurrency.md) and
belongs to Sprint 3. Full output:
[`docs/evidence/2026-11-05_sprint-0-verification.md`](../docs/evidence/2026-11-05_sprint-0-verification.md).

## Next step

Sprint 0 is an audit, not an implementation. The next code layer is gated on owner approval of
ADR-008 and ADR-011. The prioritized defect list is in
[`docs/audit/2026-11-05_sprint-0-audit.md`](../docs/audit/2026-11-05_sprint-0-audit.md).
