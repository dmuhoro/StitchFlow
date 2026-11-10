# Security Model

> Companion to [`../SECURITY.md`](../SECURITY.md). This file is the engineering invariant list.

## Authentication

Supabase Auth issues the session JWT. The browser uses the publishable key only. `AuthModal` supports
email/password and magic link. Demo role entry is a presentation feature and must be disabled when
`VITE_DATA_MODE=supabase`.

## Authorization primitives

| Predicate | Returns true when |
|-----------|-------------------|
| `is_atelier_member(id)` | caller has an active member row in that atelier |
| `is_atelier_staff(id)` | caller is an active owner or employee there |
| `is_atelier_owner(id)` | caller is an active owner there |
| `current_member_atelier_id()` | caller's active tenant |
| `current_member_role()` | caller's active role |
| `client_owns_order(order)` | order.client_id = caller |

All are `SECURITY DEFINER`, `STABLE`, `search_path = ''`, with `PUBLIC`/`anon` execute revoked and
`authenticated` granted. They exist to break policy recursion between `ateliers` and `members`, not
to expose an RPC surface.

## Invariants

### Tenant isolation

1. An owner reads only their own atelier's orders, measurements, appointments, feedback, lookbook.
2. An employee reads only orders assigned to them; they may read the member directory of their
   atelier so patron names resolve.
3. A patron reads only rows whose `client_id` is their auth uid; they may read owner/employee rows
   for name resolution, never another patron.
4. No caller may change `atelier_id`, `client_id`, or `assigned_tailor_id` to cross a tenant.
   Triggers raise on tenant reassignment.
5. `active = false` revokes access on the next query.

### Money

6. `order_financials` is owner-write.
7. A patron reads the row for their own order only.
8. An artisan never reads `order_financials`.
9. A patron cannot write a balance.
10. Every `order_financials` insert, update, or delete is recorded with its actor and before/after
    values. Only atelier owners may read those financial audit rows.

### Anonymous perimeter

10. `anon` reads `ateliers` only through the granted public column list.
11. `anon` reads `lookbook_items` only where `is_published = true`.
12. `anon` cannot insert appointments until the rate-limited guest booking boundary ships. Only a
    member with the client role may insert an own-tenant pending request with no assigned tailor.
13. `anon` cannot read orders, members, measurements, feedback, or financials.
14. `anon` cannot execute any booking RPC or read any booking table.

### Booking store

15. `bookings` has no direct write policy. Every mutation goes through `hold_slot`,
    `confirm_booking`, `cancel_booking`, or `reschedule_booking`.
16. The four RPCs are `SECURITY DEFINER`, `SET search_path = ''`, check tenant membership inside the
    function, and are granted only to `authenticated` and `service_role`.
17. `bookings_no_overlap` (`EXCLUDE USING gist (resource_id WITH =, during WITH &&)` for `held` and
    `confirmed`) is the final authority on overlap.
18. `idempotency_keys` has RLS enabled with no policies; only the definer RPCs can read or write it.
    It retains the original hold token so a lost response can be replayed within the hold window.

### Role integrity

14. A member cannot change their own `role` or `active`.
15. Only an owner can change another member's role or active.
16. `created_by` cannot be reassigned.

## Secrets

- Browser-permitted: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_MODE`.
- Never in the browser: service-role key, database URL with password, JWT secret, provider tokens.
- `.env.local` is gitignored; `.env.example` is placeholders only.
- Evidence files redact credentials as `***REDACTED***`.

## Residual risks

| Risk | Severity | Status / mitigation |
|------|----------|--------------------|
| Demo identities, PIN `1234` and credential cards in the Supabase-mode bundle | **P0** | Source aliases exclude demo modules; `postbuild` `verify:build` rejects demo strings, and a production deploy context fails unless `VITE_DATA_MODE=supabase` with real Supabase values. CI proves the gate rejects a demo artifact. |
| Legacy appointment requests can overlap as requested times | **Not a booking** | Pending rows are proposals only. Direct anonymous inserts are revoked; staff confirmation requires a protected booking and resource exclusion. Production carries the matched booking/insert migrations. |
| A client could insert a `confirmed` appointment without a protected booking | **P1 — closed** | The client insert policy allows only an own-tenant `pending` request with no assigned tailor; the update guard still applies. RLS tests 13–14, staff S7. |
| Live-site booking confirmation has not been exercised successfully in a browser | **Pilot blocker** | Hosted owner/employee/patron read-only journeys pass. The owner-approved synthetic fixture reset succeeded, but the one browser attempt failed before a hold because `.env.pilot` retained a stale date. The request remains pending and its linked synthetic booking is cancelled; clear the override and obtain renewed authorization before another write-capable attempt. |
| `idempotency_keys` retains the original hold token for replay | Medium | Client roles are denied by RLS; only definer RPCs read it. Short hold window. |
| No owner/employee `INSERT` policy on `appointments` | Intentional boundary | Staff booking belongs to the protected `hold_slot` workflow, not legacy appointment insertion. |
| Guest self-booking has no rate limit or bot challenge | Medium | Direct anonymous writes are disabled in the migration and live visitor UI; implement the edge boundary before reopening. |
| Financial edit audit migration applied; live journey remains blocked | **Reduced risk / verify live use** | Remote migration parity is current through `20261108173000`; rollback-only hosted RLS proof and local actor/before/after assertions pass. |

Production schema parity was verified on 2026-11-08 through `20261108173000`. Six hosted identities
and synthetic fixtures exist. The hosted rollback-only RLS proof passed, the approved Vercel
deployment is READY, and owner/employee/patron read-only browser journeys pass 3/3. Hosted booking
remains blocked after one attempt failed before a hold because `.env.pilot` retained a stale date;
the synthetic request is pending and its linked booking is cancelled. A retry requires renewed
owner authorization.

## How to verify

```bash
npm run verify:db
```

The suite asserts every invariant above with adversarial SQL and aborts on any leak.
