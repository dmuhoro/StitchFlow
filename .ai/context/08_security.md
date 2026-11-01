# Security Brief

> Condensed from `docs/security.md`.

## Authentication

- Supabase Auth. The browser holds the publishable key and a session JWT.
- `AuthModal` has two paths: demo role entry and Supabase email/password or magic link.
- Demo entry is a presentation feature. In a production build (`VITE_DATA_MODE=supabase`) it must be
  unreachable; otherwise it is a P0.

## Authorization

RLS is the only real boundary. UI gates are cosmetic. Policies use direct `auth.uid()` and three
narrow `SECURITY DEFINER` predicates with `search_path = ''`:

- `is_atelier_member(uuid)`
- `is_atelier_staff(uuid)`
- `is_atelier_owner(uuid)`
- `current_member_atelier_id()`, `current_member_role()`
- `client_owns_order(uuid)`

`PUBLIC` and `anon` have no execute grant on any of them; `authenticated` does.

## Tenant invariants (must always hold)

1. An owner reads only their own atelier's orders, measurements, appointments, feedback, lookbook.
2. An employee reads only orders assigned to them, and the member directory of their atelier.
3. A patron reads only rows whose `client_id` is their auth uid, plus owner/employee directory rows.
4. A patron reads only the `order_financials` row for their own order.
5. An anonymous visitor reads only published lookbook rows and the public atelier columns.
6. An anonymous visitor may insert only a `pending`, account-less appointment.
7. Deactivating a member revokes access on the next query.
8. No caller can change `atelier_id`, `client_id`, or `assigned_tailor_id` to escape their tenant.

## Public surface

`anon` receives `SELECT` on a column list of `ateliers` (id, name, slug, tagline, city, country,
default_currency, whatsapp_number, default_unit, timestamps). It does not receive table-wide
`SELECT`, so `created_by` and future internal columns stay private.

## Secrets

- Permitted browser variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_MODE`.
- Forbidden in the browser: service-role key, database password, JWT secret, any provider secret.
- `.env.local` is gitignored. `.env.example` contains placeholders only.

## Residual risks

| Risk | Status |
|------|--------|
| Demo PIN in production | Must be disabled (P0) |
| No rate limiting on anonymous booking | Open; PostgREST-level, post-launch |
| No appointment capacity lock | Open; post-launch |
| Remote project access unverified | Blocked on owner authorization |
