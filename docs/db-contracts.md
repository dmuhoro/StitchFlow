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

**Legacy status (2026-11-07):** this table is unchanged by the Sprint 3 booking engine. It still has
no resource, duration, hold, idempotency key, or overlap constraint, and
`appointments_public_insert` is retained. It is a second booking store until ADR-009 §8 retires it.

### `booking_resources`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `kind` | text | `cutter`, `fitter`, `fitting_room`, `workshop` |
| `display_name` | text | required |
| `capacity` | integer | default 1; constrained to `= 1` in this layer |
| `timezone` | text | IANA timezone used by availability rules |
| `active` | boolean | inactive resources are not bookable |
| `created_at`, `updated_at` | timestamptz | |

**Access:** members read active resources in their tenant; owners read and manage all resources.

**Limit:** `capacity > 1` needs explicit `booking_slots` and is not implemented. The check rejects a
capacity the exclusion constraint cannot honour.

### `resource_availability_rules`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `resource_id` | uuid | composite FK with `atelier_id` |
| `weekday` | smallint | `0` Sunday … `6` Saturday (`extract(dow)`) |
| `starts_at`, `ends_at` | time | local wall-clock window; `ends_at > starts_at` |
| `valid_from`, `valid_to` | date | optional validity bounds |
| `created_at`, `updated_at` | timestamptz | |

**Access:** members read their tenant's rules; owners write. No rule means the resource is not
bookable — availability fails closed.

### `blackout_dates`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `resource_id` | uuid | nullable; null closes the whole tenant |
| `during` | tstzrange | finite, non-empty |
| `reason` | text | |
| `created_at`, `updated_at` | timestamptz | |

**Access:** members read their tenant's blackouts; owners write.

### `bookings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `atelier_id` | uuid | tenant |
| `resource_id` | uuid | composite FK with `atelier_id` |
| `during` | tstzrange | finite, non-empty; normalised to `[)` |
| `status` | text | `held`, `confirmed`, `cancelled`, `expired` |
| `client_id` | uuid | nullable for a guest booking |
| `guest_name`, `guest_phone`, `guest_email` | text | contact snapshots |
| `service_type` | text | required |
| `cultural_occasion`, `notes` | text | |
| `idempotency_key` | text | original hold key, unique per atelier where present |
| `hold_token_hash` | text | only the hash of the hold token is stored here |
| `hold_expires_at` | timestamptz | required while `status = 'held'` |
| `created_at`, `updated_at` | timestamptz | |

**Constraint:** `bookings_no_overlap` is
`EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE status IN ('held', 'confirmed')`.
Two live reservations for one resource can never overlap; the database is the authority.

**Access:** staff read all bookings in their tenant; a patron reads their own. There is deliberately
no `INSERT`, `UPDATE`, or `DELETE` policy — every mutation goes through an RPC.

### `idempotency_keys`

| Column | Type | Notes |
|--------|------|-------|
| `atelier_id` | uuid | tenant; part of the primary key |
| `scope` | text | `hold_slot` or `reschedule_booking` |
| `idempotency_key` | text | 1–200 characters; part of the primary key |
| `payload_hash` | text | canonical payload hash |
| `result` | jsonb | original result returned on replay |
| `booking_id` | uuid | affected booking |
| `created_at` | timestamptz | |

**Access:** RLS enabled with **no policies**. Client roles cannot read or write the ledger; only the
`SECURITY DEFINER` RPCs can. The original result retains the hold token so a lost response can be
replayed; booking rows retain only the token hash.

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
| `hold_slot(...)` | security definer, RPC | tenant check, availability/blackout, expiry sweep, exclusion-backed hold, idempotent replay |
| `confirm_booking(text)` | security definer, RPC | token hash lookup, tenant check, `held` → `confirmed` |
| `cancel_booking(uuid)` | security definer, RPC | tenant/role check, idempotent `cancelled` |
| `reschedule_booking(uuid, tstzrange, text)` | security definer, RPC | atomic range move with idempotent replay |
| `expire_stale_holds(uuid, uuid)` | security definer, internal | marks expired holds for one resource |
| `booking_window_error(uuid, uuid, text, tstzrange)` | security definer, internal | availability/blackout predicate |

All definer functions set `search_path = ''`; `PUBLIC` and `anon` execute is revoked. The four public
RPCs are granted to `authenticated` and `service_role`; the two internal helpers are granted to no
client role.

`hold_slot` error tokens include `forbidden`, `resource_unavailable`, `outside_availability`,
`blackout`, `slot_in_past`, `slot_unavailable`, and `idempotency_key_conflict`. The delivery brief
names the RPC `hold_slot` and the conflict `slot_unavailable`; ADR-009 uses `book_slot` and
`SLOT_TAKEN` for the same concepts.

`create_atelier_with_owner(text, text, text, text)` is the supported owner-onboarding boundary. It
is created by `supabase/migrations/20261106160000_atomic_owner_onboarding.sql`, runs as one
transaction, and is callable only by `authenticated`. The retired
`create_atelier_for_current_user(...)` name is revoked and dropped. The browser calls the RPC via
`src/lib/atelier-repository.ts`; it never performs separate atelier/member inserts.

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
20261106120000_sprint1_audit_log.sql
20261106130000_sprint1_invitations.sql
20261106140000_sprint1_invite_accept.sql
20261106150000_sprint1_hardening.sql
20261106160000_atomic_owner_onboarding.sql
20261107120000_booking_engine.sql
```

`rls_final` is authoritative for policies; `currency_alignment` widens the currency contract to
`KES`/`USD`/`NGN` for both `order_financials.currency` and `ateliers.default_currency`. Earlier files
are historical layers kept so the chain replays. `booking_engine` is expand-only: it adds the
resource/booking tables and RPCs and does not alter `appointments`.

## Verification

`npm run verify:db` applies the chain to an empty `postgres:16`, loads `supabase/seed.sql`, runs the
12-scenario `supabase/tests/rls_isolation_test.sql`, the hosted/local E2E suite, the booking-engine
RLS/RPC suite, and a 200-attempt / 50-concurrent exclusion proof, then asserts RLS on every public
table.

The booking suite proves the new `bookings` store. It does **not** make `appointments` safe: that
legacy table still accepts overlapping rows and its anonymous insert policy is retained. Gate 8
closure for the legacy table is ADR-009 §8 work, not part of this layer. Evidence:
[`evidence/2026-11-07-booking-engine.md`](evidence/2026-11-07-booking-engine.md).
