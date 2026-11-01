# StitchFlow Engineering Constitution

> The non-negotiable operating rules for every task in the StitchFlow repository.
> This document is the highest-authority engineering governance. It overrides convenience, speed, and
> scope-creep in favour of correctness. Conflicts with any other document resolve here.

---

## Article I — Execution safety

1. **Never let code claim a protection it does not actually provide.** False confidence is worse than
   no protection. If an evidence gate, grep, or test can pass while the production path stays
   unguarded, the work is not done.
2. **Enforcement goes at the real boundary.** Before wiring a guard, read the actual call site and
   cite `file:line`. Insert protection where the live query or write happens, not in a helper that
   only the demo or tests use.
3. **Fail closed, never fail open.** Defaults refuse. When unsure, choose the conservative outcome.
4. **Proof must exercise the real path.** A test of a standalone helper does not prove wiring. The
   test must assert that the real repository call is refused or permitted.
5. **Say no early, loudly.** If a plan has a flawed insertion point or a false gate, say so and
   propose the corrected version before executing.
6. **No silent drops.** A rejection returns a reason, is visible to the caller, and leaves a record.

---

## Article II — Tenant isolation (highest-priority invariant)

1. Every tenant table carries `atelier_id`. Every query is either explicitly scoped or covered by a
   policy proven by `supabase/tests/rls_isolation_test.sql`.
2. A cross-tenant read or write is a **P0 defect** regardless of environment or author.
3. Tenant-scoping changes require a `docs/db-contracts.md` update and a negative test in the same
   commit.
4. `SECURITY DEFINER` is permitted only for narrow membership predicates with `search_path = ''`,
   qualified relations, and `PUBLIC`/`anon` execute revoked.
5. A deactivated member loses access on the next query.

---

## Article III — Money integrity

1. Balances live only in `order_financials`. They are never duplicated onto `orders`.
2. A patron may read the balance on their own order. A patron may never write a balance.
3. Artisans may never read `order_financials`.
4. Money is `numeric(12,2)`, never floating point. Formatting happens at the display boundary.
5. Every supported currency (`KES`, `USD`, `NGN`) must be formattable and must satisfy the database
   check constraint. A seed value the constraint rejects is a defect, not a test fixture problem.
6. A failed financial write is surfaced; it is never reported as success.

---

## Article IV — Cultural fidelity

1. Garment structures, measurement labels, and textile provenance are product requirements.
2. Agbada wingspan, Fila cap circumference, Sokoto inseam, Buba chest, Kitenge print alignment, Kanzu
   robe drop, and posture/drape notes must remain explicit. Never replace them with generic fashion
   fields.
3. Copy, seed data, and UI must describe how people across Africa actually dress. Do not flatten
   regional specificity into a generic silhouette.

---

## Article V — Security

1. Secrets live in a gitignored `.env.local`, a secret manager, or the host environment. Never in the
   repository, a commit message, a log, a fixture, or an evidence file.
2. Only the publishable key reaches the browser. A service-role key in a `VITE_*` variable is a P0.
3. Client-side role gates are cosmetics. RLS is the boundary.
4. The demo PIN must be unreachable in a production build.
5. If a secret is committed, assume compromise: rotate first, then clean history.

---

## Article VI — Testing and evidence

1. The tree is green before any push: `npm run lint`, `npm run build`, `npm run check:docs`, and
   `npm run verify:db` when SQL changed.
2. RLS, money, and persistence changes ship with tests that would fail without the change.
3. Never weaken an existing assertion to make a build pass.
4. A diagnostic test that documents a bug must be fixed or marked with a linked issue. A pass count
   never implies an unresolved defect is closed.
5. Every release produces an evidence file under `docs/evidence/`. A PASS cites a command, test, or
   manual step — never narrative alone.

---

## Article VII — Process and release

1. Work sequentially in layers. Finish one layer (code + tests + docs) before the next.
2. One concern per commit, conventional prefix, imperative subject.
3. Migrations are forward-only. Seed data lives in `supabase/seed.sql`.
4. Every release gets a version bump, `CHANGELOG.md` entry, sprint record, release note, and an
   annotated tag pushed to the remote.
5. Docs move with code in the same change. `docs/` is canonical; `.ai/context` is a summary.
6. New dependencies require justification against what is already installed.
7. Feature freeze: no new subsystem while a P0 gate in `docs/release-readiness.md` is open.

---

## Article VIII — Honesty

1. Report gaps accurately. Closing one gap never means "risk is complete."
2. Credential-blocked work is reported as BLOCKED with its human owner, never as an engineering
   backlog item.
3. Do not claim a deployment, a live verification, or a remote state that was not observed.
4. If the plan cannot be completed as stated, say what is done, what is not, and why.

---

*Constitution effective at v1.0.0. Any amendment is an edit to this document accompanied by an ADR.*
