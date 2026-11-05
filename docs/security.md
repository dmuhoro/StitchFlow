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

### Anonymous perimeter

10. `anon` reads `ateliers` only through the granted public column list.
11. `anon` reads `lookbook_items` only where `is_published = true`.
12. `anon` inserts `appointments` only with `status = 'pending'` and `client_id is null`.
13. `anon` cannot read orders, members, measurements, feedback, or financials.

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
| Demo identities, PIN `1234` and credential cards ship in the Supabase-mode bundle | **P0** | Refused at the runtime action boundary, but present in the artifact; `verify:build` does not assert absence. Sprint 1. |
| Overlapping appointments are accepted; no exclusion constraint, resource or hold | **P0** | Gate 8 FAIL. ADR-009 / Sprint 3. |
| No owner/employee `INSERT` policy on `appointments` | P1 | Staff cannot create a fitting. Sprint 3. |
| Anonymous booking has no rate limit | Medium | PostgREST/edge rate limit post-launch |
| No audit trail for owner money edits | Medium | Add audit table in Sprint 1 |
| Hosted project access unverified | Blocker for deploy | Owner authorization |

## How to verify

```bash
npm run verify:db
```

The suite asserts every invariant above with adversarial SQL and aborts on any leak.
