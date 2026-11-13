# 2026-11-13 — Observability seam: funnel events and crash reporting

## Problem

The repository had no observability at all: no analytics, no error reporting, and no
record of whether a real visitor reached the front door, signed in, or completed a
booking. `AppErrorBoundary` logged a crash to the browser console and nothing left the
machine. `docs/current-state.md` listed monitoring and alerting as **ASPIRATIONAL**.

Two constraints shaped the design:

- The money and identity surface is real (`order_financials`, `deposit_amount`,
  `balance_due`, patron emails and phones). A telemetry payload must never be able to
  carry a name, email, phone, order code, atelier id, note, or amount.
- Telemetry must never break the workflow it observes, and must never claim a capture
  it does not perform.

## Change

- `src/lib/telemetry.ts` — provider-agnostic core:
  - event names are allowlisted (`landing_view`, `auth_signed_in`,
    `booking_confirmed`, `app_error`);
  - properties are limited to five enumerated keys with enumerated values
    (`data_mode`, `route`, `role`, `outcome`, `error_kind`); free text, numbers,
    objects, and unknown keys are dropped;
  - `redactPageUrl` strips query strings and fragments, because invite codes travel in
    `?invite=`;
  - the default sink is a no-op and every call is wrapped, so a throwing sink cannot
    escape;
  - `MAX_PROPERTIES` bounds one event to five properties.
- `src/lib/telemetry-vercel.ts` — Vercel Web Analytics adapter using
  `inject()` and `track()`, plus a `beforeSend` hook that re-redacts page-view URLs.
  Installed only in production builds (`import.meta.env.PROD`).
- Wired at the real boundaries, not in helpers:
  - `landing_view` — `AtelierLanding` after the atelier resolves (once per mount);
  - `auth_signed_in` — `signInWithPassword` after Supabase accepts the credentials;
  - `booking_confirmed` — `BookingWorkspace.confirmRequest` only after
    `confirmed.status === 'confirmed'`; a hold or a failed confirm never reaches it;
  - `app_error` — `AppErrorBoundary.componentDidCatch` (render) and the global
    `error` / `unhandledrejection` listeners in `src/main.tsx`.
- `src/lib/telemetry.test.ts` — 12 tests with a fake sink.

## Commands and results

Environment: Node `22.22.1`, Chromium via Playwright, disposable Supabase stack.

```
$ npm run test:unit
Test Files  3 passed (3)
Tests       21 passed (21)      # 9 existing + 12 telemetry

$ npm run lint
exit 0

$ npm run build
✓ built
PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
exit 0

$ npm run test:e2e:hermetic
6 passed (22.7s)
PASS: hermetic browser suite is green against a disposable stack.
exit 0

$ npm run check:docs
PASS: 179 relative Markdown links resolve across 106 files.
exit 0

$ vercel api /v9/projects/prj_aAjFkv5rqDMkPY0dzt4Gm1FVNQnH \
    --scope team_sGSR187e4tniaRMCYJ8yb0JG
{ "nodeVersion": "22.x",
  "webAnalytics": { "id": "HdneXreI1Q3E9wMjCRHDHOwnh" },
  "speedInsights": { "id": "sOpbzbhHi22ZEzZrXAYydv4uxk5", "hasData": false } }
```

Unit coverage that matters: identity/tenant/money keys are stripped
(`email`, `phone`, `full_name`, `atelier_id`, `order_code`, `deposit_amount`,
`balance_due`); a free-text value is rejected even under an allowlisted key; a
non-allowlisted event name is dropped; and both `track` and `pageview` throwing sinks
leave the caller untouched.

## What is actually captured

| Capability | Status |
|------------|--------|
| Web Analytics configured on the Vercel project | **YES** — project reports a `webAnalytics.id` |
| Page views | **ARMED, NOT LIVE** — the currently served artifact predates this code, so capture starts with the next deploy |
| Custom events (`landing_view`, `auth_signed_in`, `booking_confirmed`, `app_error`) | **BLOCKED** — Vercel lists custom events as Pro/Enterprise only; on Hobby the provider drops `track()` |
| Speed Insights | Configured but `hasData: false` |
| Self-hosted or non-Vercel deployment | **NO CAPTURE** — the adapter targets Vercel Web Analytics only |

No production event has been observed. Nothing in this change makes that claim.

## Verdict

**PARTIAL — the seam is correct and proven; remote custom-event capture is plan-gated.**

Owner: Repository owner — upgrade the Vercel project from Hobby to Pro (also required
for commercial use) and deploy the current artifact. After that, `landing_view`,
`auth_signed_in`, `booking_confirmed`, and `app_error` become collectable without
further code changes.

## Privacy note

Payloads cannot contain personal data by construction, not by convention: the sanitiser
accepts only enumerated values. Page-view URLs are stripped of query strings and
fragments twice — in the adapter's `beforeSend` and by `redactPageUrl` — so an invite
code cannot be sent as part of a path. No cookie or identifier is set by this module
beyond whatever Vercel Web Analytics itself uses.
