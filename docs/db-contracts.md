# Database Contracts

> Canonical table contracts. Agent summary: `.ai/context/05_db-contracts.md`.
> Every change to a table, policy, or money field updates this file in the same commit.

## Tenancy model

`public.ateliers` is the tenant root. Every tenant table references it with
`on delete cascade`. `public.order_progress_notes` derives its tenant through `orders`; it has no
`atelier_id` column.

A user belongs to exactly one atelier through `public.members.id = auth.uid()`.

## Tables

### `ateliers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `name`, `slug` | text | `slug` unique |
| `tagline` | text | |
| `city`, `country` | text | nullable until onboarding completes |
| `default_currency` | text | `KES`, `USD`, `NGN` |
| `phone`, `whatsapp_number` | text | |
| `default_unit` | text | `in` or `cm` |
| `created_by` | uuid | auth user; cannot be reassigned |
| `created_at`, `updated_at` | timestamptz | |

**Access:** `anon` may select the public column list only. Members may select their own atelier.
Owners may update. Insert requires `created_by = auth.uid()`.

### `members`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | `auth.users(id)`, cascade delete |
| `atelier_id` | uuid | tenant |
| `role` | text | `owner`, `employee`, `client` |
| `full_name` | text | |
| `phone`, `email`, `avatar_url`, `title`, `specialty` | text | |
| `active` | boolean | default true; false revokes access |
| `created_at`, `updated_at` | timestamptz | |

**Access:** self; staff for their atelier; patron for owner/employee rows only. Owner manages role
and active. `guard_member_mutation` blocks identity, tenant, role, and active changes by non-owners.

### `lookbook_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `title`, `category`, `description`, `fabric` | text | required |
| `price_range` | text | display string |
| `turnaround_days` | integer | |
| `image_url` | text | bundled asset URL or hosted URL |
| `cultural_origin` | text | contractual |
| `tags` | text[] | |
| `is_featured` | boolean | |
| `is_published` | boolean | public visibility |
| `created_at`, `updated_at` | timestamptz | |

**Access:** `anon` and authenticated see `is_published = true`. Staff see all in their atelier.
Staff insert/update; owner delete.

### `orders`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | internal |
| `atelier_id` | uuid | tenant |
| `order_code` | text | public code, unique per atelier |
| `client_id`, `assigned_tailor_id` | uuid | members |
| `status` | text | `cutting`, `stitching`, `fitting`, `ready` (+ legacy `delivered`) |
| `description`, `garment_type`, `fabric_details` | text | required |
| `estimated_delivery` | date | |
| `photo_url` | text | |
| `created_at`, `updated_at` | timestamptz | |

**Access:** owner all; assigned employee read/update; patron read own. Patron and artisan names are
resolved from `members`; they are not stored here.

### `order_financials`

| Column | Type | Notes |
|--------|------|-------|
| `order_id` | uuid pk | `orders(id)` cascade |
| `atelier_id` | uuid | tenant |
| `deposit_amount` | numeric(12,2) | `>= 0` |
| `balance_due` | numeric(12,2) | `>= 0` |
| `currency` | text | `KES`, `USD`, `NGN` |
| `updated_at` | timestamptz | |

**Access:** owner read/write; patron read own order only (`client_owns_order`); artisan never.

### `order_progress_notes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `order_id` | uuid | `orders(id)` cascade; tenant derived |
| `author_id` | uuid | member |
| `stage` | text | production stage |
| `note` | text | |
| `created_at` | timestamptz | |

**Access:** owner; assigned employee; patron for own order. Staff insert on their order.

### `measurements`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `client_id` | uuid | member |
| `unit` | text | `in` or `cm` |
| `chest`, `waist`, `hips`, `length`, `sleeve`, `shoulder`, `inseam`, `neck` | numeric(6,2) | universal |
| `agbada_wingspan` | numeric(6,2) | Grand Agbada drape wingspan |
| `sokoto_inseam` | numeric(6,2) | Sokoto trouser inseam |
| `fila_cap_head` | numeric(6,2) | Fila cap circumference |
| `buba_chest` | numeric(6,2) | Buba relaxed chest |
| `posture_notes` | text | drape and cultural notes |
| `verified_at` | timestamptz | last artisan verification |
| `created_at`, `updated_at` | timestamptz | |

**Access:** owner; assigned employee; patron own. Unique `(atelier_id, client_id)`.

### `appointments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `client_id` | uuid | nullable for anonymous requests |
| `client_name`, `client_phone` | text | nullable after reconciliation; required at form level |
| `client_email` | text | |
| `service_type` | text | ceremonial service enum |
| `slot_datetime` | timestamptz | |
| `status` | text | `pending`, `confirmed`, `completed`, `cancelled` |
| `assigned_tailor_id` | uuid | |
| `cultural_occasion`, `notes`, `reference_url` | text | |
| `created_at`, `updated_at` | timestamptz | |

**Access:** `anon` insert only when `status = 'pending'` and `client_id is null`; patron own; owner
all; assigned employee read/update.

### `feedback`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `order_id` | uuid | `on delete set null` |
| `client_id` | uuid | |
| `rating` | integer | 1–5 |
| `fit_rating` | text | `tight`, `perfect`, `loose` |
| `comments` | text | |
| `resolution_status` | text | `open`, `addressed`, `resolved` |
| `created_at` | timestamptz | |

**Access:** patron own insert/read; owner read/update in tenant.

## Functions

| Function | Kind | Purpose |
|----------|------|---------|
| `is_atelier_member(uuid)` | security definer, stable | active membership |
| `is_atelier_staff(uuid)` | security definer, stable | owner or employee |
| `is_atelier_owner(uuid)` | security definer, stable | owner only |
| `current_member_atelier_id()` | security definer, stable | caller's tenant |
| `current_member_role()` | security definer, stable | caller's role |
| `client_owns_order(uuid)` | security definer, stable | patron own-order predicate |
| `guard_member_mutation()` | trigger | blocks role/tenant escalation |
| `prevent_atelier_creator_reassignment()` | trigger | immutable creator |
| `set_updated_at()` | trigger | UTC timestamp |

All definer functions set `search_path = ''`; `PUBLIC` and `anon` execute is revoked.

`create_atelier_for_current_user(...)` is **not** part of the current schema. It was created in
`20261031110000_baseline_reconciliation.sql` and dropped in
`20261031111500_direct_uid_rls.sql:160`, and no later migration recreates it. Owner onboarding is
currently two client-side inserts in `src/lib/atelier-repository.ts`, not an atomic RPC. See
`docs/audit/2026-11-05_sprint-0-audit.md` `S0-P1-02`.

## Migration order

```
001_initial_schema.sql
20261031110000_baseline_reconciliation.sql
20261031110500_security_hardening.sql
20261031111000_security_advisor_cleanup.sql
20261031111113_direct_uid_rls_preflight.sql
20261031111200_revoke_public_function_execute.sql
20261031111500_direct_uid_rls.sql
20261031112000_rls_final.sql
20261031113000_currency_alignment.sql
```

`rls_final` is authoritative for policies; `currency_alignment` widens the currency contract to
`KES`/`USD`/`NGN` for both `order_financials.currency` and `ateliers.default_currency`. Earlier files
are historical layers kept so the chain replays.

## Verification

`npm run verify:db` applies the chain to an empty `postgres:16`, loads `supabase/seed.sql`, runs the
12-scenario `supabase/tests/rls_isolation_test.sql`, and asserts RLS on every public table.

The suite proves gates 1–7. It does **not** prove appointment concurrency: there is no exclusion
constraint on `appointments`, and two overlapping rows are accepted. Gate 8 is intentionally FAIL
and is owned by Sprint 3 / [ADR-009](adr/ADR-009-booking-concurrency.md). Evidence:
[`evidence/2026-11-05_sprint-0-verification.md`](evidence/2026-11-05_sprint-0-verification.md).
