# ADR-002 — Direct `auth.uid()` policies with narrow definer predicates

**Status:** Accepted (supersedes the helper-heavy policy set)
**Date:** 2026-11-01

## Context

An early policy pass used broad `SECURITY DEFINER` helpers inside policies. Cross-referencing
`ateliers` and `members` inside policies caused recursion and made it hard to reason about what was
actually permitted. A later pass removed helpers entirely, but that made patron balance reads and
staff name resolution impossible without leaking more than intended.

## Decision

Use direct `auth.uid()` predicates wherever a policy can express the rule against its own row. Use
`SECURITY DEFINER` only for the six membership/ownership predicates needed to break recursion:

- `is_atelier_member`, `is_atelier_staff`, `is_atelier_owner`
- `current_member_atelier_id`, `current_member_role`
- `client_owns_order`

Each pins `search_path = ''`, qualifies every relation, is `STABLE`, and revokes `PUBLIC`/`anon`
execute. `authenticated` receives execute.

The authoritative set is `supabase/migrations/20261031112000_rls_final.sql`.

## Consequences

- Patrons can read the balance on their own order without reading anyone else's.
- Staff can resolve patron and artisan names.
- Policies are readable one table at a time.
- The definer functions are a small, auditable attack surface that must not grow casually.
- A new policy must be proven by an adversarial scenario.

## Alternatives considered

- **No helpers, all direct predicates:** cannot express cross-table membership without recursion.
- **A single `current_user_role()` helper:** hides the tenant parameter and invites unscopeable
  policies. Rejected.
- **Application-layer authorization:** contradicts ADR-001.
