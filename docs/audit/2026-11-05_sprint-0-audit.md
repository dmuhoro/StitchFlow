# Sprint 0 Audit — Verify and Decide

**Date:** 2026-11-05
**Repository:** `github.com/dmuhoro/StitchFlow`
**Baseline commit:** `d06262a` (after the Sprint 0 dependency, test and ADR commits)
**Scope:** audit only. No feature code was written. No Sprint 1 behaviour was implemented.

## 1. Executive summary

StitchFlow v1.0.0 is **a demo-first React SPA with a real Supabase schema and RLS foundation**. It is
not yet a production atelier system. The database boundary is stronger than the product boundary:
the 12-scenario RLS suite passes, but the tenant is still chosen on the client, the public front
door is client-rendered, there is no booking concurrency control, and the production JavaScript
bundle still contains demo identities, the demo PIN and demo credential cards.

**Verification gates: 7 PASS, 1 FAIL.** Gate 8 (appointment capacity and double-booking) has no
database enforcement at all.

**Two P0 defects:**

1. `S0-P0-01` — demo code (including the literal `Demo PIN: 1234`) ships in a production-mode
   bundle, and `verify:build` passes anyway. This is a false-confidence gate.
2. `S0-P0-02` — overlapping bookings are accepted; there is no resource model, exclusion constraint,
   hold, or idempotency key. Gate 8 cannot pass until Sprint 3.

The audit also found a functional RLS gap: **no role may insert an appointment on the staff path**
(the final policy set has no owner/employee `INSERT` policy), so an owner cannot create a fitting on
a patron's behalf. This is recorded as `S0-P1-03`.

**Decision required:** approve or reject ADR-008 through ADR-011. They are committed as `Proposed`,
not `Accepted`. Sprint 1 must not start until ADR-008 and ADR-011 are approved, because they change
the app shell, session model and tenant resolution.

## 2. What actually runs in each mode

`VITE_DATA_MODE` defaults to `demo` (`src/lib/supabase.ts:7`). `supabase` mode throws at module load
when the URL or publishable key is missing. The table below is the observed behaviour, not the
aspiration.

| Capability | Demo mode | Supabase mode | Evidence |
|------------|-----------|---------------|----------|
| Identity | Seeded profile cards, PIN `1234`, role switch | Supabase Auth email/password or magic link | `AuthModal.tsx:80-105`, `StitchFlowContext.tsx:596-617` |
| Data source | Seeded arrays in `localStorage` | PostgREST queries through RLS | `StitchFlowContext.tsx:248-270`, `atelier-repository.ts` |
| Tenant choice | Two hardcoded tenants, `localStorage` switch | Member's `atelier_id` after sign-in; public path uses a hardcoded default id | `StitchFlowContext.tsx:159-196`, `:378`, `:802` |
| Public lookbook | Seeded local records | Published rows for one atelier id | `loadPublicAtelierSnapshot` |
| Booking write | Local array | Anonymous insert with `status='pending'`, `client_id=null` | `rls_final.sql:456-457` |
| Order / measurement writes | Local array | Repository `persist*` calls; failures surfaced | `saveOrToast` |
| Money | Display-only, hardcoded FX | `order_financials` read/write; no payments | `context:659-668`, `atelier-repository.ts:246` |
| Notifications | WhatsApp click-to-chat only | Same (no server delivery) | `FloatingWhatsApp.tsx` |
| Media | Bundled images or remote URLs | Same (no storage) | ADR-006 |
| Audit trail | None | None | catalog: 0 audit tables |
| SSR / share preview | No | No | `index.html`, `App.tsx` |
| Demo code in bundle | Yes | **Yes — P0 defect** | production bundle grep below |

The context still imports `INITIAL_PROFILES`, `INITIAL_ORDERS`, `INITIAL_MEASUREMENTS`,
`INITIAL_APPOINTMENTS`, `INITIAL_FEEDBACK` and `INITIAL_LOOKBOOK` unconditionally
(`StitchFlowContext.tsx:22-29`). `isProductionMode` only chooses different initial state and refuses
demo actions at runtime; it does not remove the demo code from the artifact.

## 3. Database inventory (disposable `postgres:16`)

Applied chain: `001_initial_schema.sql` → `20261031110000_baseline_reconciliation.sql` →
`20261031110500_security_hardening.sql` → `20261031111000_security_advisor_cleanup.sql` →
`20261031111113_direct_uid_rls_preflight.sql` → `20261031111200_revoke_public_function_execute.sql` →
`20261031111500_direct_uid_rls.sql` → `20261031112000_rls_final.sql` →
`20261031113000_currency_alignment.sql`, then `seed.sql`.

### 3.1 Tables

All 9 public tables have RLS enabled.

| Table | Tenant key | Notes |
|-------|------------|-------|
| `ateliers` | root | public marketing columns granted to `anon` |
| `members` | `atelier_id` | one row per auth user; `active=false` revokes access |
| `lookbook_items` | `atelier_id` | public only when `is_published=true` |
| `orders` | `atelier_id` | public `order_code` unique per atelier |
| `order_financials` | `atelier_id` | mutable balances; no ledger |
| `order_progress_notes` | derived via `orders` | no `atelier_id` column |
| `measurements` | `atelier_id` | unique `(atelier_id, client_id)` |
| `appointments` | `atelier_id` | no resource, duration, hold or overlap constraint |
| `feedback` | `atelier_id` | owner read/update; patron own insert/read |

**Absent by design at this baseline:** audit-log tables, ledger/payment/webhook tables, booking
resource/hold tables, media tables, invitation tables, consent records. Catalog check:
`audit_tables=0`, `exclusion_constraints=0`.

### 3.2 Policies

**52 policies** exist across the 9 tables. The authoritative set is
`20261031112000_rls_final.sql`. The policy families are:

| Table | Policies |
|-------|----------|
| `ateliers` | public read; member read; owner insert; owner update |
| `members` | self read; staff read; patron read of owner/employee only; first-owner insert; owner insert/update/delete; self update |
| `lookbook_items` | public published read; member read; staff insert/update; owner delete |
| `orders` | owner read/insert/update/delete; employee assigned read/update; patron own read |
| `order_financials` | owner read/insert/update/delete; patron own read; no employee access |
| `order_progress_notes` | owner read/update; assigned employee read; patron own read; staff insert |
| `measurements` | owner read/write; assigned employee read/insert/update; patron own read |
| `appointments` | owner read/update/delete; assigned employee read/update; patron own read/insert; anon pending insert |
| `feedback` | owner read/update; patron own read/insert |

Notable policy facts:

- `anon` receives only a column-level `SELECT` grant on `ateliers` (id, name, slug, tagline, city,
  country, currency, WhatsApp, unit, timestamps) and published `lookbook_items`.
- `SECURITY DEFINER` functions: 8, all with `search_path=''`, `PUBLIC`/`anon` execute revoked and
  `authenticated` granted where needed: `is_atelier_member`, `is_atelier_staff`, `is_atelier_owner`,
  `current_member_atelier_id`, `current_member_role`, `client_owns_order`, `guard_member_mutation`,
  `rls_auto_enable`.
- **No owner or employee `INSERT` policy exists on `appointments`.** The owner can read, update and
  delete, but cannot create. The only insert paths are a patron's own row and an anonymous pending
  row. `S0-P1-03`.

### 3.3 Functions and documentation drift

At the audited baseline, `docs/db-contracts.md:174` listed `create_atelier_for_current_user(...)` as
an onboarding RPC (the row was removed in 1.0.1).
The function is created in `20261031110000_baseline_reconciliation.sql:275`, then **dropped** in
`20261031111500_direct_uid_rls.sql:160` and never recreated. Catalog check:
`create_atelier_rpc=0`. The client also does not call it; it performs two separate inserts
(`atelier-repository.ts:69-100`). This is documentation drift **and** a non-atomic onboarding path
(`S0-P1-02`).

## 4. Repository inventory

All database access is in `src/lib/atelier-repository.ts`. Functions and their current boundary:

| Function | Kind | Scoping / risk |
|----------|------|----------------|
| `getCurrentMember` | read | self only; active only |
| `getAtelier` | read | by id; RLS check |
| `listAtelierMembers` | read | by atelier; RLS check |
| `createAtelierForCurrentUser` | write | two inserts, **not one transaction**; orphan atelier on second failure |
| `signOut` | auth | Supabase session |
| `loadAtelierSnapshot` | read | 8 queries in parallel; notes query is **not** `.eq('atelier_id')` (`:122`) |
| `loadPublicAtelierSnapshot` | read | by atelier id; published only |
| `persistOrderStatus` | write | finds order by `order_code` alone (`:233`) |
| `persistOrder` | write | order + financials + note; client supplies code and amounts |
| `persistTailorAssignment` | write | updates by `order_code` alone (`:254`) |
| `persistMeasurement` | write | upsert by `(atelier_id, client_id)` |
| `persistAppointment` | write | anon or member; no conflict check |
| `persistAppointmentStatus` | write | by id; RLS check |
| `persistFeedback` | write | finds order by `order_code` alone (`:293`) |
| `persistFeedbackStatus` | write | by id; owner policy |
| `persistLookbookItem` | write | always publishes (`is_published: true`) |
| `persistAtelierSettings` | write | updates name/tagline/WhatsApp/currency/unit |

`src/lib/storage.ts` is demo-only namespaced `localStorage`. `src/lib/supabase.ts` contains the
fail-closed mode gate. There is no repository for invitations, audit records, payments, resources,
holds, notifications, media, or consent.

## 5. The eight verification gates

Run on a disposable `postgres:16` via `npm run verify:db` plus targeted SQL. Full command output is
in [`docs/evidence/2026-11-05_sprint-0-verification.md`](../evidence/2026-11-05_sprint-0-verification.md).

| # | Gate | Verdict | Proof |
|---|------|---------|-------|
| 1 | Owner signs in and reads only their atelier | **PASS** | RLS scenario 1 + targeted gate SQL: own=1, other=0 |
| 2 | Employee cannot read another atelier's orders or measurements | **PASS** | RLS scenario 3: otherOrders=0, otherMeasurements=0 |
| 3 | Patron reads only own order, appointment, measurement | **PASS** | RLS scenario 4: orders=2, appointments=1, measurements=1, other=0 |
| 4 | Anonymous visitor reads only published lookbook | **PASS** | RLS scenario 5: published=3, drafts=0, orders=0, members=0 |
| 5 | Patron cannot update order, balance, measurement | **PASS** | RLS scenario 11: orders=0, financials=0, measurements=0 |
| 6 | Staff cannot change tenant IDs through an update payload | **PASS** | RLS scenario 12: 3/3 mutation guards blocked |
| 7 | Deactivated members lose access immediately | **PASS** | RLS scenario 10: orders=0, measurements=0 |
| 8 | Appointment capacity and double-booking enforced server-side | **FAIL** | No exclusion constraint; two overlapping pending rows accepted; no owner insert policy |

### Gate 8 evidence (negative result)

Catalog: `exclusion_constraints=0`. The `appointments` table has only primary key, status check and
the atelier foreign key. Two anonymous inserts at the same `slot_datetime` for the same
`assigned_tailor_id` both succeeded:

```
GATE 8 evidence: exclusionConstraints=0, overlappingRowsAccepted=2
GATE 8 FAIL no database no-overlap enforcement
AUDIT owner appointment insert result=-1 (-1 = denied)
```

The second line is a separate defect: an owner inserting a confirmed appointment is refused by RLS
because the policy set contains no owner `INSERT` policy.

## 6. Prioritized defect list

Severity: **P0** blocks a production atelier; **P1** correct before the relevant sprint exit;
**P2** correctness/hygiene; **P3** polish.

| ID | Sev | Defect | Evidence | Impact | Target |
|----|-----|--------|----------|--------|--------|
| S0-P0-01 | P0 | Demo identities, demo PIN `1234`, credential cards and demo tenant slugs ship in a `VITE_DATA_MODE=supabase` bundle; `verify:build` still passes | production bundle grep: `Demo PIN: 1234`, `Demo role gate`, `Authorized Credential Cards`, `Wanjiku Kamau`; `AuthModal.tsx:85,237`; `verify-build.mjs:73-84` | Violates Constitution V.4 and the Sprint 1 zero-demo exit; the gate cannot catch a regression | Sprint 1 |
| S0-P0-02 | P0 | No booking overlap enforcement, no resources, no holds, no idempotency | `exclusion_constraints=0`; two overlapping rows accepted; `rls_final.sql:437-474`; `001_initial_schema.sql:131-151` | Double-booked cutter/fitter; customer trust and fabric loss | Sprint 3 |
| S0-P1-01 | P1 | Tenant is chosen on the client; public path starts from hardcoded Nairobi and anonymous bookings target it | `StitchFlowContext.tsx:159-196`, `:378`, `:802`; no route/slug/domain resolver | Any atelier URL shows the default tenant; cannot support slug or custom domain | Sprint 2 |
| S0-P1-02 | P1 | Owner onboarding is two non-transactional inserts; documented onboarding RPC does not exist | `atelier-repository.ts:69-100`; `db-contracts.md` baseline line 174 (corrected in 1.0.1); dropped at `20261031111500_direct_uid_rls.sql:160` | Orphan atelier on failure; no authoritative onboarding path | Sprint 1 |
| S0-P1-03 | P1 | Owner/employee cannot insert an appointment | policy catalog: only `appointments_public_insert` and `appointments_client_insert_own`; owner insert attempt denied | Staff cannot create or reschedule a fitting on behalf of a patron | Sprint 3 |
| S0-P1-04 | P1 | Order writes find a row by `order_code` alone; uniqueness is per atelier | `atelier-repository.ts:233,254,293`; unique index `(atelier_id, order_code)` | Same code in two tenants makes `.maybeSingle()` ambiguous or updates the wrong visible row | Sprint 1 |
| S0-P1-05 | P1 | Money display converts every amount from KES with hardcoded rates | `StitchFlowContext.tsx:659-668` | NGN/USD tenant balances display wrong values; false financial information | Sprint 4 |
| S0-P1-06 | P1 | Order creation fabricates a client-side code and hardcoded deposit/balance defaults | `StitchFlowContext.tsx:701-742` | Collisions, invented money, optimistic state diverges from server | Sprint 5 |
| S0-P1-07 | P1 | No audit trail for orders, measurements, payments, settings or role changes | `audit_tables=0`; no trigger in the chain | Cannot investigate a dispute or prove who changed a measurement/balance | Sprint 1 |
| S0-P1-08 | P1 | No SSR, per-tenant metadata, sitemap, robots, OG or structured data | `App.tsx:18-40`; `index.html` has generic title and `bolt.new` OG image | WhatsApp shares show a generic preview; public pages need JavaScript; poor SEO | Sprint 2 |
| S0-P1-09 | P1 | Anonymous booking has no rate limit, bot challenge, phone validation or edge boundary | no edge function in tree; `rls_final.sql:456-457` accepts any pending row | Spam and resource exhaustion; abusive bookings | Sprint 3 |
| S0-P1-10 | P1 | No sign-up/onboarding/invite UI or user provisioning flow | `AuthModal` is sign-in only; no invite repository or table | A real owner cannot create an atelier or invite staff/clients end to end | Sprint 1 |
| S0-P1-11 | P1 | No unit or browser test framework; only TypeScript, docs, build and SQL scripts | `package.json` scripts; no vitest/playwright config | Regressions in components, auth and booking cannot be caught in CI | Sprint 1/3 |
| S0-P2-01 | P2 | `loadAtelierSnapshot` reads `order_progress_notes` without an atelier predicate | `atelier-repository.ts:122` | RLS currently contains it, but it violates defence-in-depth and fails closed only by policy | Sprint 1 |
| S0-P2-02 | P2 | `delivered` exists in the database status check but not in `ProductionStatus` | `001_initial_schema.sql:92`; `types.ts:10` | Legacy rows render an untyped status; UI transitions undefined | Sprint 5 |
| S0-P2-03 | P2 | `Profile.passkey` remains in types and demo data after the database column was dropped | `types.ts:45`; `20261031110000_baseline_reconciliation.sql:109` | Dead field invites a future plaintext credential | Sprint 1 |
| S0-P2-04 | P2 | No CSP or HSTS; only four security headers | `netlify.toml:14-20` | Weaker XSS and transport protection; CSP cannot use nonces until SSR | Sprint 2 |
| S0-P2-05 | P2 | README, current-state, sprint 01 and release-readiness contradict each other on release status | `sprint-01:21-24` says L6-L8 pending; `release-readiness.md:16-19` says DONE | Operators cannot tell what is shipped; audit finding is itself a docs defect | This audit |
| S0-P2-06 | P2 | `legacy-peer-deps=true` hides peer drift; `bun.lock` was stale and is removed in 1.0.1 | `.npmrc` | Peer incompatibility can be installed silently; npm is now the single lockfile | Sprint 1 |
| S0-P2-07 | P2 | `members_owner_insert` lets an owner attach any existing auth user id to their tenant without an invite/consent record | `rls_final.sql:239-240` | An owner can add a member unilaterally; no invitation audit | Sprint 1 |
| S0-P2-08 | P2 | Public atelier read returns every tenant row; there is no public directory policy distinction | `rls_final.sql:198-199`, `:498-502` | Intended public-read surface, but it makes cross-tenant enumeration trivial; keep only marketing columns | Sprint 2 |
| S0-P2-09 | P2 | No appointment `duration`, timezone, working hours or blackout data | `001_initial_schema.sql:131-151` | Cannot express a real atelier calendar | Sprint 3 |
| S0-P3-01 | P3 | `rls_auto_enable` event-trigger function exists as SECURITY DEFINER with no attached trigger in this chain | function catalog | Dead security surface; execute revoked, but unnecessary | Sprint 1 |
| S0-P3-02 | P3 | `formatCurrency`/settings amounts use `number` in the client while DB uses numeric | `types.ts:48-58`, `context:659-668` | Display rounding only today; must not become a write path | Sprint 4 |
| S0-P3-03 | P3 | `index.html` repeats `twitter:card` and uses a third-party default OG image | `index.html` | Cosmetic/SEO; replaced by SSR metadata | Sprint 2 |

## 7. Dependency and hygiene audit

Removed in this sprint (unused, proven by repository-wide import search):

| Dependency | Why removed |
|------------|-------------|
| `express`, `@types/express` | no server entry point or import |
| `dotenv` | Vite loads env; no script imports it |
| `@google/genai` | no import; AI Studio remnant |
| `autoprefixer` | no PostCSS config; Tailwind 4 handles prefixes |
| `esbuild` | no direct use; Vite brings its own |
| `motion` | no import in `src/` |
| `tsx` | no script uses it |

Remaining direct dependencies are all imported by application code or the build (`react`,
`react-dom`, `@supabase/supabase-js`, `lucide-react`, `vite`, `@vitejs/plugin-react`,
`@tailwindcss/vite`, `tailwindcss`, `typescript`, `@types/*`). `npm audit --audit-level=high`
reports **0 vulnerabilities**.

`.env.example` now contains only the Supabase browser contract. The GEMINI and APP_URL entries were
removed as dead configuration.

## 8. Production bundle leak (P0 detail)

The production build used synthetic non-secret values in CI style:

```bash
VITE_SUPABASE_URL=https://example-project.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_verification_only \
VITE_DATA_MODE=supabase npm run build
VITE_DATA_MODE=supabase npm run verify:build
```

`verify:build` printed PASS. A direct grep of `dist/` found:

```
Demo PIN: 1234
Demo role gate
Authorized Credential Cards
Wanjiku Kamau
stitchflow-nairobi
asooke-lagos
```

The runtime action guards are real (`AuthModal.tsx:81`, `StitchFlowContext.tsx:576`, `:871`) and the
PIN is not accepted in production. But the literal and the demo data still ship, and the artifact
gate checks only that the guard strings exist (`verify-build.mjs:78-83`), not that demo code is
absent. That is the definition of a false-confidence gate in Constitution Article I.1. Sprint 1
must move demo into a separate build target and make the verifier assert the absence of demo
markers in production.

## 9. Blocked and human-owned work

These were **not** verified in this environment. They are not engineering backlog items.

| Item | Status | Owner / needed authorization |
|------|--------|------------------------------|
| Hosted Supabase project state | BLOCKED | Repository owner; no hosted credentials in this environment |
| Remote migration apply | BLOCKED | Repository owner; must not be inferred from local replay |
| Netlify deploy / live URL | BLOCKED | Repository owner; deploy authorization |
| Custom-domain DNS and certificates | BLOCKED | Atelier operator + repository owner |
| M-Pesa / card gateway credentials | BLOCKED | Repository owner / atelier; server secret store only |
| WhatsApp Business API sender and templates | BLOCKED | Atelier operator; Meta approval |
| Kenya/Nigeria data-protection review | BLOCKED | Human legal/privacy owner; not an agent claim |

No live credential, patron record, or hosted verification was used or claimed in this audit.

## 10. Decisions proposed and Sprint 1 entry criteria

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-008 | One TanStack Start app: public SSR group + authenticated app group | Proposed |
| ADR-009 | Booking exclusion constraints + expiring holds + idempotency | Proposed |
| ADR-010 | Append-only payments ledger + idempotent webhooks + derived balances | Proposed |
| ADR-011 | Tenant resolution by verified domain, subdomain, then slug path | Proposed |

Sprint 1 may start only after the owner approves ADR-008 and ADR-011 (they change the application
shell and the tenant/session boundary). ADR-009 and ADR-010 govern Sprint 3 and Sprint 4 and can be
approved in the same review.

Sprint 1 entry checklist:

- [ ] Approve ADR-008 and ADR-011 (and confirm ADR-009/010 direction).
- [ ] Confirm the production host can run SSR (Netlify adapter or Node host).
- [ ] Confirm the demo subdomain name.
- [ ] Provide hosted Supabase access only through the host environment, never chat.
- [ ] Accept that Sprint 1 closes S0-P0-01, S0-P1-02, S0-P1-04, S0-P1-07, S0-P1-10, S0-P1-11.

## Appendix A — Commands run

```bash
npm run lint
npm run check:docs
npm run build && npm run verify:build
VITE_SUPABASE_URL=https://example-project.supabase.co \
  VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_verification_only \
  VITE_DATA_MODE=supabase npm run build
VITE_DATA_MODE=supabase npm run verify:build
npm run verify:db
npm audit --audit-level=high
```

Results: lint PASS; docs PASS (69 links / 68 files); demo build PASS; supabase-mode artifact check
PASS but bundle grep found demo markers; database PASS (12/12 scenarios + structural assertions);
audit 0 vulnerabilities; production bundle check PASS (false confidence, see §8).

## Appendix B — Gate 8 reproduction

After the migration chain and seed are loaded, two overlapping pending bookings are accepted:

```sql
set local role anon;
set local "request.jwt.claims" = '{}';
insert into public.appointments
  (atelier_id, client_name, client_phone, service_type, slot_datetime, status, assigned_tailor_id)
values
  ('11111111-1111-1111-1111-111111111111','Double Book A','+254700000010',
   'basted_fitting', timestamptz '2026-12-01 10:00+03','pending',
   'a2222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111','Double Book B','+254700000011',
   'basted_fitting', timestamptz '2026-12-01 10:00+03','pending',
   'a2222222-2222-2222-2222-222222222222');
reset role;
select count(*) from public.appointments
where assigned_tailor_id = 'a2222222-2222-2222-2222-222222222222'
  and slot_datetime = timestamptz '2026-12-01 10:00+03';
-- observed: 2
```

This is why gate 8 is **FAIL**, not "at risk". ADR-009 defines the fix and its acceptance test.

## Appendix C — Audit method

1. Read `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, the Constitution, ADRs 001–007, current-state,
   architecture, db-contracts, release-readiness, sprint records and source.
2. Replayed the migration chain + seed into a disposable `postgres:16`.
3. Queried `pg_tables`, `pg_policies`, `pg_proc`, `pg_constraint`, `information_schema.triggers` and
   column grants.
4. Ran the 12-scenario RLS suite and targeted SQL for gates 1–8.
5. Built both modes and grepped the production artifact for demo markers.
6. Audited imports for dead dependencies and ran `npm audit`.

No source file was changed to make a test pass. The only source changes in Sprint 0 were dependency
removal, two additional adversarial test scenarios, and documentation/ADR records.
