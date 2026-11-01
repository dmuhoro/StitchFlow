# Data and Persistence Brief

> How StitchFlow reads and writes data, and where the boundary is.

## Two modes, one switch

`VITE_DATA_MODE` in `src/lib/supabase.ts`:

| Mode | Behaviour |
|------|-----------|
| `demo` (default) | Seeded arrays + namespaced `localStorage`. No network. Presentation only. |
| `supabase` | Repository calls against Postgres. Requires URL and publishable key or the module throws. |

Unknown values fall back to `demo`. `supabase` mode without config fails at import time — fail closed.

## Read path

`loadAtelierSnapshot(atelierId)` issues eight parallel reads: members, orders, progress notes,
financials, measurements, appointments, feedback, lookbook. It maps rows into domain types:

- resolves `client_name` / `assigned_tailor_name` from the member map,
- joins `order_financials` by `order_id`,
- converts `order_code` into the client `Order.id`,
- tolerates a missing financial row (patron RLS can return fewer rows).

A snapshot is only as complete as the caller's RLS visibility. Do not assume every order has a
financial row.

## Write path

Every supported action has a `persist*` function. The context calls it only in `supabase` mode and
then reloads the snapshot or patches state from the confirmed result. A failed write throws; the
context surfaces a toast and does not claim success.

Writes covered at this release: order create, order status, tailor assignment, measurement upsert,
appointment create, appointment status, feedback create, feedback resolution, lookbook create,
atelier settings update.

Writes deliberately not offered in `supabase` mode: tenant switching (the switcher is demo-only),
reset-to-defaults against a live tenant (destructive), and role escalation.

## Fail-closed rules

1. No write is attempted when `supabase` is unconfigured.
2. Demo-only destructive actions are disabled in `supabase` mode with an explicit message.
3. The demo PIN path is removed from a production build.
4. A missing order code is an error, not a silent no-op.

## Local storage

Keys are namespaced `stitchflow_`. `clearStitchFlowStorage()` removes only that namespace. Storage
failure is swallowed for the demo because the in-memory state still works; it is never used as a
production persistence guarantee.
