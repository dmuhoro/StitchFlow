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
| 8 | Confirmed fitting has an exclusive resource reservation | **IMPLEMENTED, NEW MIGRATION PROOF PENDING** — status trigger links confirmed requests to the protected booking store |
| 8B | Booking-store overlap exclusion, holds, expiry, and idempotency | **PASS** — RPC suite B1–B23 plus 200 attempts / 50 concurrent: 1 success, 199 `slot_unavailable`, 0 duplicates (local and CI run [42371377892](https://github.com/dmuhoro/StitchFlow/actions/runs/42371377892)) |

`appointments` is a request inbox; it still has no resource, duration, hold, idempotency key, or
overlap constraint. Migrations require a protected booking before confirmation, disable anonymous
inserts, and limit client inserts to own-atelier pending requests without staff assignment. The
booking workflow and migrations pass local DB verification and are applied to production; hosted
browser proof still needs owner-provisioned identities. See
[`hosted repair evidence`](../docs/evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md).

## Next step

Reconcile production migration history (done 2026-11-08), then provision owner/employee/patron
fixtures and run the hosted browser flows. The guest edge-function boundary with rate limits and a bot
challenge is still required before public booking.
The prioritized defect list is in
[`docs/audit/2026-11-05_sprint-0-audit.md`](../docs/audit/2026-11-05_sprint-0-audit.md).
