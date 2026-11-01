# Domain Model Brief

> Condensed from `docs/db-contracts.md` and `src/types.ts`.

## Tenant

**Atelier** is the tenant. One row in `public.ateliers` owns every operational record through
`atelier_id`. The repository exposes `AtelierSummary` with `default_currency` and `default_unit`.
The original baseline used `currency` and `whatsapp`; the reconciliation migration renames them.

- Currency in the database: `KES`, `USD`, `NGN`.
- Measurement unit: `in` or `cm`.
- `created_by` is the auth user who onboarded the atelier and cannot be reassigned.

## Membership

**Member** is one auth user in one atelier (`public.members`). `id` is the `auth.users` id, so a
person belongs to exactly one atelier in the current model.

| Role | Capability |
|------|------------|
| `owner` | Full atelier control, money, member management, settings |
| `employee` | Assigned orders, assigned patron measurements, stage notes |
| `client` | Own orders, own measurements, own balance, own feedback, staff directory (owner/employee only) |

`active = false` removes access immediately; every helper predicate checks it.

## Production

**Order** is a garment commission.

- `id` (uuid) is internal; `order_code` (e.g. `ORD-892`) is the human/public code.
- Status is `cutting → stitching → fitting → ready`. The original baseline also allowed `delivered`;
  the client type does not yet model it — treat it as a compatibility value, not a UI stage.
- Patron and artisan names are resolved from `members`, never stored on the order.
- Progress notes (`order_progress_notes`) record stage, note, author and time. The table derives its
  tenant from the order, not a duplicated column.

## Money

**Order financials** live in `public.order_financials`, one row per order.

- `deposit_amount`, `balance_due`, `currency` (`KES`, `USD`, `NGN`).
- Owners read and write. A patron may read the balance on their own order only. Artisans never read.
- Money is stored as `numeric(12,2)`, never floating point. Display formatting is centralized in the
  context's `formatCurrency` and must handle every supported currency.

## Measurements

**Measurement** is one card per patron per atelier (`unique (atelier_id, client_id)`).

Universal points: chest, waist, hips, length, sleeve, shoulder, inseam, neck.

African haute couture points (contractual, do not genericize):

| Field | Meaning |
|-------|---------|
| `agbada_wingspan` | Grand Agbada three-piece drape wingspan |
| `sokoto_inseam` | Traditional drawstring Sokoto trouser inseam |
| `fila_cap_head` | Fila ceremonial cap head circumference |
| `buba_chest` | Inner Buba tunic relaxed chest circumference |
| `posture_notes` | Drape, shoulder drop, corsetry and cultural notes |

`verified_at` records the last artisan verification.

## Fittings

**Appointment** is a fitting request or scheduled slot.

- Status: `pending → confirmed → completed | cancelled`.
- Type: `ruracio_bridal`, `grand_agbada`, `senator_kaftan`, `kitenge_wax_styling`, `basted_fitting`,
  `final_collection`.
- Anonymous visitors may create a `pending` request with `client_id is null`. They may not create a
  confirmed slot, read the schedule, or attach an account.

## Lookbook

**LookbookItem** is a catalog entry. Public readers see `is_published = true` only. Staff see all
entries in their atelier. Category is one of Grand Agbada & Boubou, Senator Suits & Kaftans,
Ceremonial & Bridal, Modern Kitenge & Wax, Heritage Tunics & Kanzu.

## Feedback

**Feedback** is a patron fit review: rating 1–5, fit `tight | perfect | loose`, comments, resolution
`open | addressed | resolved`. A patron writes and reads their own; an owner reads and resolves all
in the atelier.

## Cultural invariants

Garment names, textile provenance, ceremonial occasion, and measurement labels are product data.
They may be extended, never replaced with generic fashion vocabulary.
