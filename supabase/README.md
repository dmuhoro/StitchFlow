# Supabase backend

The connected Supabase project is the relational backend for StitchFlow. Its project ref is `vpathqzkaqdtbykumxeo` in `eu-central-1`.

The initial production foundation has been applied remotely through the Supabase migration API. It contains:

- `ateliers` for tenant/workshop settings
- `members` linked to `auth.users` with owner, employee, and client roles
- `lookbook_items` for published and private atelier catalog entries
- `orders` and `order_progress_notes` for garment production
- `measurements` for standard and African garment-specific dimensions
- `appointments` for fitting requests and scheduled slots
- `feedback` for patron fit reviews and resolution state

All tables have Row Level Security enabled. Staff access is tenant-scoped. Patrons can access only records tied to their own member ID. Public lookbook access is limited to published entries.

## Local configuration

Copy `.env.example` to `.env.local` and provide the Supabase project URL and publishable browser key. Keep `VITE_DATA_MODE=demo` until the first owner account and atelier have been provisioned. Switch to `supabase` only after Auth and the tenant bootstrap flow are verified.

Never put a service-role key in Vite environment variables or browser code.

## Verification gates

Before importing real data, verify in the Supabase Auth and SQL consoles that:

1. An owner can sign in and read only their atelier.
2. An employee cannot read another atelier's orders or measurements.
3. A patron can read only their own order, appointment, and measurement records.
4. An unauthenticated visitor can read only published lookbook entries.
5. A patron cannot update an order, balance, or measurement.
6. A staff member cannot change tenant IDs through an update payload.
7. Deleted or inactive members lose access immediately.
8. Appointment capacity and double-booking protection are enforced server-side before launch.

The next implementation step is migrating the React context from browser-local arrays to the repository layer in `src/lib/atelier-repository.ts`, while retaining seeded demo mode for preview environments.
