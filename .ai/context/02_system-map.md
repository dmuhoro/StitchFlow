# System Map

> Where each concern lives. Verified against the tree at the current release.

## Root

| Path | Purpose |
|------|---------|
| `src/` | Application source |
| `supabase/` | Migrations, seed, RLS tests, local config |
| `scripts/` | Operational scripts (DB verification, CI checks) |
| `docs/` | Canonical architecture, ADRs, evidence, runbooks, readiness |
| `sprints/` | Dated sprint records |
| `.ai/` | Agent context and role briefs |
| `design/` | Cultural design briefs and visual direction |
| `.github/` | CI workflow and contribution templates |

## `src/`

| Path | Contents |
|------|----------|
| `src/main.tsx` | React root |
| `src/App.tsx` | Shell, view switch, modal mounting |
| `src/components/` | Presentation and portal views |
| `src/context/StitchFlowContext.tsx` | State machine and actions |
| `src/data/initialData.ts` | Demo profiles, orders, measurements, lookbook |
| `src/assets/images/` | Bundled ceremonial garment imagery |
| `src/lib/supabase.ts` | Client, mode gate, fail-closed config |
| `src/lib/atelier-repository.ts` | All Supabase reads/writes |
| `src/lib/storage.ts` | Namespaced localStorage for demo mode |
| `src/types.ts` | Domain contracts |

## Components that matter most

| Component | Role |
|-----------|------|
| `PublicPortfolio.tsx` | Anonymous lookbook, fitting request, order tracking |
| `BookingModal.tsx` | Fitting-request flow |
| `AuthModal.tsx` | Demo role entry and Supabase sign-in |
| `AccessGate.tsx` | UI role boundary (cosmetic, not security) |
| `OwnerDashboard.tsx` | Director suite: production, clients, lookbook, feedback |
| `TailorDashboard.tsx` | Artisan workbench: assigned orders, measurements |
| `ClientPortal.tsx` | Patron orders, balances, feedback, referral |
| `SettingsModal.tsx` | Atelier settings and theme |
| `OrderTrackerModal.tsx` | Public order milestone tracking |

## `supabase/`

| Path | Contents |
|------|----------|
| `migrations/001_initial_schema.sql` | Original baseline |
| `migrations/20261031110000_baseline_reconciliation.sql` | Brings the baseline to the client contract |
| `migrations/20261031110500_security_hardening.sql` | Financials split, integrity triggers |
| `migrations/20261031111500_direct_uid_rls.sql` | Direct-uid policy pass |
| `migrations/20261031112000_rls_final.sql` | Authoritative policy set |
| `seed.sql` | Deterministic pilot tenants and records |
| `tests/rls_isolation_test.sql` | Adversarial tenant-isolation proof |
| `config.toml` | Local Supabase CLI configuration |

## `scripts/`

| Path | Purpose |
|------|---------|
| `verify-db.sh` | Apply migrations + seed + RLS suite to a disposable Postgres |
| `db/supabase-shim.sql` | Minimal `auth` schema/roles for plain Postgres |
| `ci/check-doc-links.mjs` | Fail on broken relative Markdown links |
| `ci/verify-build.mjs` | Assert the production bundle has no demo-only leaks |

## `docs/`

| Path | Purpose |
|------|---------|
| `docs/architecture.md` | Canonical architecture |
| `docs/current-state.md` | What is shipped vs aspirational |
| `docs/db-contracts.md` | Table contracts and RLS ownership |
| `docs/security.md` | Security model |
| `docs/release-readiness.md` | Go/no-go gates and task list |
| `docs/adr/` | Architectural Decision Records |
| `docs/engineering/CONSTITUTION.md` | Supreme engineering rules |
| `docs/evidence/` | Dated verification records |
| `docs/releases/` | Release notes |
| `docs/runbooks/` | Deployment, DB verification, rollback |
