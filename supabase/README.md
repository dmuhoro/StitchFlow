# Supabase backend

The connected Supabase project is the relational backend for StitchFlow. Its project ref is
`qkhfjlxhulekjrfgrdbz` in `eu-central-1`.

The migration chain under `supabase/migrations/` is the source of truth for the schema. It contains:

- `ateliers` for tenant/workshop settings
- `members` linked to `auth.users` with owner, employee, and client roles
- `lookbook_items` for published and private atelier catalog entries
- `orders` and `order_progress_notes` for garment production
- `measurements` for standard and African garment-specific dimensions
- `appointments` for legacy fitting requests and scheduled slots
- `feedback` for patron fit reviews and resolution state
- `booking_resources`, `resource_availability_rules`, `blackout_dates`, `bookings`, and
  `idempotency_keys` for the Sprint 3 booking engine (database layer only)
- `audit_log` and `invitations` for the append-only audit trail and invitation ledger

All 16 public tables have Row Level Security enabled. Staff access is tenant-scoped. Patrons can
access only records tied to their own member ID. Public lookbook access is limited to published
entries. The booking store is stricter: `bookings` is read-only through RLS and every write goes
through a `SECURITY DEFINER` RPC.

**Not verified by the 2026-11-05 audit:** the hosted project's current schema, whether the latest
migrations are applied remotely, and the live Auth configuration. The local replay proves the chain;
it does not prove remote parity. Remote migration is owner-authorized work.

## Local configuration

Copy `.env.example` to `.env.local` and provide the Supabase project URL and publishable browser key.
Keep `VITE_DATA_MODE=demo` until the first owner account and atelier have been provisioned. Switch to
`supabase` only after Auth and the tenant bootstrap flow are verified.

Never put a service-role key in Vite environment variables or browser code.

## Verification gates — result on 2026-11-07

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
| 8 | Appointment capacity and double-booking protection on the legacy `appointments` table | **FAIL** — table unchanged by this layer; see ADR-009 §8 |
| 8B | Booking-store overlap exclusion, holds, expiry, and idempotency | **PASS locally** — RPC suite B1–B23 plus 200 attempts / 50 concurrent: 1 success, 199 `slot_unavailable`, 0 duplicates |

Gate 8 remains open for `appointments`: it still has no resource, duration, hold, idempotency key, or
overlap constraint, no owner/employee `INSERT` policy, and has no resource model. Its
`appointments_public_insert` policy is retained. Gate 8B closes only for the new `bookings` store,
which the browser does not call yet. Evidence:
[`docs/evidence/2026-11-07-booking-engine.md`](../docs/evidence/2026-11-07-booking-engine.md).

## Next step

Frontend wiring of the booking RPCs, retirement/backfill of `appointments` (ADR-009 §8), and the
guest edge-function boundary with rate limits and a bot challenge. The prioritized defect list is in
[`docs/audit/2026-11-05_sprint-0-audit.md`](../docs/audit/2026-11-05_sprint-0-audit.md).
