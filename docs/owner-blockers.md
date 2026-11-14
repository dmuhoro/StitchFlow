# Owner blockers

Owner-only items: credentials, billing, DNS, third-party accounts, and approvals.
Engineering cannot close these, so they are recorded here rather than carried as
backlog (Constitution Article VIII.2). No secret value belongs in this file —
only the name of the thing and the action the owner takes.

**Status:** `OPEN` = owner action required. `CLOSED` = owner performed it and the
result is recorded. `BLOCKED` = cannot proceed until a precondition outside
engineering exists.

---

## Credentials

| ID | Item | Exact owner action | Status | Evidence |
|----|------|--------------------|--------|----------|
| **B1** | Production Supabase project | Create the project in the Supabase dashboard, then provide **names only** — `VITE_DATA_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — as Vercel Production environment variables. Do not paste values into chat, an issue, or a PR. | **OPEN** | Production project does not exist. Verified 2026-11-14 with `vercel env pull --environment=production`: Production and Preview both resolve to `qkhfjlxhulekjrfgrdbz` (staging). See B17 and `docs/owner-preview-status.md` row 6. |
| **B17** | Vercel **Production** points at the **staging** database | Before the first production deploy, change the three Production environment variables (`VITE_DATA_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) to the production project from B1. Until then, a Production deployment writes real patron data into staging. | **OPEN** | `vercel env pull --environment=production` → `qkhfjlxhulekjrfgrdbz`; `vercel env pull --environment=preview` → the same ref. Names only, no value printed. |
| **B2** | Supabase database password rotation | Supabase → Project Settings → Database → Reset database password. | **CLOSED** | Owner confirmed rotation; `OWNER_ACTIONS.md` (PR #3) "Owner credential rotation" entry; blast radius in `docs/evidence/2026-11-10_bundle-secret-boundary.md`. |
| **B3** | Supabase personal access token revocation | Supabase → Account → Access Tokens → Revoke the token that was exposed in `.env.local`. It is account-level, so it is broader than the database. | **OPEN** | Recorded unresolved in `OWNER_ACTIONS.md` (PR #3) P0 list. |
| **B4** | Live backup/restore credential (Session pooler) | Paste only the Dashboard-generated **Session pooler** URI at the hidden prompt of `npm run ops:set-source-db` (run it by itself). The direct `db.<ref>.supabase.co` host is IPv6-only and will not work from the current network. | **BLOCKED** | Pooler reached Supabase but authentication was rejected; no dump ran. `docs/evidence/2026-11-13_source-db-setup-probe.md`, `docs/evidence/2026-11-10_hosted-rehearsal-precondition.md`. |

## Billing and hosting

| ID | Item | Exact owner action | Status | Evidence |
|----|------|--------------------|--------|----------|
| **B5** | Netlify account credit | Restore billing on the Netlify account, or approve removing Netlify from the deploy path. Netlify rejects new deploys with 403 credit exhaustion. | **OPEN** | Netlify deploy 403 recorded in `docs/evidence/2026-11-08_v1.4.0-rc.2-hosted-repair.md` (per the recorded commit message `2d55e0a`). |
| **B6** | Vercel plan for custom telemetry events | Decide whether to upgrade Vercel to Pro. Custom analytics events are dropped on Hobby, so `booking_confirmed` / `app_error` capture is plan-gated. | **OPEN** | `docs/current-state.md:130-134`; `docs/evidence/2026-11-13_observability-seam.md` (PR #3). |
| **B7** | Vercel-hosted source build | Authorize one source deploy so Vercel's own build runtime is exercised. Today only a local `vercel build --prod` is proven. | **OPEN** | `docs/current-state.md:78`, `docs/current-state.md:158`. |

## DNS and domains

| ID | Item | Exact owner action | Status | Evidence |
|----|------|--------------------|--------|----------|
| **B8** | Per-tenant custom domains | When ADR-011 is implemented, the owner controls DNS: add the CNAME/A record and the `_stitchflow` TXT verification record for each atelier domain. Engineering cannot create or verify DNS. | **OPEN** (not yet actionable — ADR-011 implemented later) | ADR-011 §5. No domain has been requested yet. |

## Approvals and third parties

| ID | Item | Exact owner action | Status | Evidence |
|----|------|--------------------|--------|----------|
| **B9** | Merge PR #3 | Review `docs/audit/2026-11-13-pr3-integration.md`, then merge **as a merge commit**. The agent does not merge. | **CLOSED** | Merged 2026-11-14 as `dea878c`; `.env*` and `.vercel` are ignored (`git check-ignore .env.pilot` → `.gitignore:20`). |
| **B10** | Tags and releases | Approve each annotated tag on `main` after a release PR. A tag is never placed on a branch. | **OPEN** (standing) | Operating contract §2; owner re-pointed `v1.0.1` on 2026-11-14. |
| **B11** | ADR-009 (booking concurrency) and ADR-010 (ledger) | Approve or reject as **Proposed**. No guest booking, capacity > 1, sweeper, or payment implementation is implied by the pilot until then. | **OPEN** | ADR headers; `docs/current-state.md:163-165`. |
| **B12** | Pilot shop page visibility | Decide when the pilot atelier's public page may drop `noindex`. It stays private/noindex until the shop owner approves. | **OPEN** | Operating contract, Decisions already made §4. |
| **B13** | Third-party accounts for later phases | Meta WhatsApp Business sender + templates, and a payment provider account, are needed only when ADR-009 §8 / ADR-010 are approved. | **BLOCKED** (not yet needed) | `docs/release-readiness.md` blocked-items table. |
| **B14** | Kenya/Nigeria data-protection review | Human legal/privacy decision before real patron data is held at scale. | **OPEN** | `docs/release-readiness.md` blocked-items table. |
| **B15** | Stale branch deletion | Delete the six branches listed in the Phase 0 hygiene report. PR #1 is closed and PR #3 is merged, so no branch is blocked by an open PR. | **OPEN** | `docs/audit/2026-11-13_phase-0-hygiene.md` §0.4-A. |
| **B16** | `v1.0.1` tag re-point | Force-update the annotated `v1.0.1` tag from the orphaned commit to a reachable one, then push. | **CLOSED** | Owner re-pointed it to `3b3212f` (an ancestor of `main`) and deleted the old object; §0.4-B. |

---

## How engineering proceeds while these are open

Per operating contract §5, blocked items do not stop unblocked work: Phase 0
hygiene, Phase 2 feature branches that do not need production, and local/CI proof
all continue. Any item whose proving command needs a credential is reported as
`NOT RUN`, never as a pass.
