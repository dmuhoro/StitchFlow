# Security Policy

StitchFlow holds atelier tenants, patron measurements, orders, and order balances. Treat every
tenant boundary and every balance as production-critical.

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` (pre-1.0) | Yes, active development |
| Tags older than the latest release | No |

## Reporting a vulnerability

Do **not** open a public issue for a suspected vulnerability. Report it privately to the repository
owner (`@dmuhoro`) through GitHub's private vulnerability reporting. Include:

- the affected table, policy, or file,
- the exact request or SQL that demonstrates the issue,
- the expected versus observed result.

You will receive an acknowledgement within 72 hours. Please do not include live credentials, patron
data, or a working exploit against a live atelier in the report.

## Security model (summary)

- **Authentication:** Supabase Auth. Browser sessions use the publishable key only.
- **Authorization:** Postgres Row Level Security on every tenant table. Direct `auth.uid()`
  predicates with narrowly scoped `SECURITY DEFINER` helpers whose `search_path` is pinned.
- **Tenant boundary:** `atelier_id` on every tenant row. Cross-tenant access is denied by policy and
  proven by `supabase/tests/rls_isolation_test.sql`.
- **Money:** balances live in `order_financials`. Owners manage them; a patron may read the balance
  on their own order only; artisans never read the table.
- **Anonymous surface:** public atelier profile and published lookbook are readable. Anonymous
  visitors may create a `pending`, account-less appointment request only.
- **Secrets:** no service-role key in the browser. See `.env.example` for the permitted variables.

## Known launch gates

These are tracked in [`docs/release-readiness.md`](docs/release-readiness.md). A launch is blocked
while any P0 gate is open, including:

- demo PIN authentication still reachable in a production build,
- unverified Supabase project access,
- unproven deployment authorization.

## Dependency checks

Run `npm run audit` before a release. A high or critical advisory blocks the tag unless it is
documented as unreachable with a cited reason.
