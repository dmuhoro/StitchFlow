# StitchFlow

### A Pan-African atelier workflow prototype for bespoke tailoring

[![CI](https://github.com/dmuhoro/StitchFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/dmuhoro/StitchFlow/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

StitchFlow is a browser-based product prototype for African bespoke ateliers creating Grand Agbadas, Senator suits, Kitenge bridalwear, Kanzus, and other ceremonial garments. It brings the lookbook, fitting requests, production stages, culturally relevant measurement cards, artisan workbench, and patron updates into one warm, mobile-friendly experience.

> **Verification status (2026-11-13):** Production migration history is current through
> `20261108173000`. The approved Vercel deployment is READY and passed the hosted owner, employee,
> and patron journeys 3/3 plus one protected booking confirmation on 2026-11-10; the live alias
> returned HTTP 200 on 2026-11-13. The hermetic local suite passes all six browser journeys twice,
> fourteen negative controls fire, and the local dump → restore → RLS rehearsal passes. A live
> restore of pilot data is still blocked on database credentials, so the pilot remains closed to real
> patron data. See [release gates](docs/release-readiness.md) and
> [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md).

## What is included

The product includes a cultural lookbook, a fitting-request flow, an atelier director view, an artisan workbench, a patron portal with the patron's own fitting requests, namespaced browser persistence, system/light/dark themes, KES/USD display formatting, mobile-friendly touch targets, and WhatsApp click-to-chat handoffs. Garment-specific concepts such as Agbada wingspan, Fila cap circumference, Sokoto taper, Kitenge print alignment, Kanzu robe drop, textile provenance, and posture/drape notes remain explicit in the product language and design briefs.

## Demo access

Protected views are presentation-oriented role demos, not production authentication. Select a seeded profile from the access modal to explore the Atelier Director Suite, Master Artisan Bench, or VIP Patron Portal. The demo PIN is `1234`.

Never use the demo PIN or client-side role gates as a security boundary in a live business deployment.

## Supabase backend foundation

The connected Supabase project contains tenant-aware tables for ateliers, members, lookbook items, orders, order progress notes, measurements, appointments, feedback, the booking engine (`booking_resources`, `resource_availability_rules`, `blackout_dates`, `bookings`, `idempotency_keys`), `audit_log`, and `invitations`. Row Level Security is enabled on every public table. Staff access is scoped to an atelier, patrons are scoped to their own records, and only published lookbook items are public. The browser integration lives in `src/lib/supabase.ts` and `src/lib/atelier-repository.ts`; backend notes and verification gates are documented in [supabase/README.md](supabase/README.md).

The local suite has 14 adversarial RLS scenarios, 15 hosted/local E2E scenarios, a booking RPC suite (B1–B23), and a staff booking slice (S1–S7). The `bookings` store is protected by a GiST exclusion constraint and four RPC-only write paths. `appointments` is now a request inbox: a client may insert only an own-tenant pending request with no assigned tailor, anonymous inserts are revoked, and a database trigger refuses a confirmed or completed status unless a linked protected booking is confirmed. Pending requests can share a requested time because they are proposals, not reserved resource time. Retiring the legacy inbox in favour of the booking store remains ADR-009 §8 work.

Copy `.env.example` to `.env.local` and provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `VITE_DATA_MODE=demo` until Supabase Auth and the first owner onboarding flow have been tested. Never place a service-role key in Vite environment variables or browser code.

## Current scope and limitations

StitchFlow is still a staged production migration. Demo mode remains the default local surface. The Supabase-mode bundle excludes demo identities and the demo PIN, and production builds fail closed unless Supabase mode and valid project settings are configured. The booking UI uses protected booking RPCs, client appointment inserts are limited to own-tenant pending requests, and production schema parity is current through `20261108173000`. Repository writes fail closed without an atelier; human-key mutations include tenant scope. Owner financial edits are audited by the applied forward-only migration. Tenant resolution remains client-side. Pilot identities and fitting fixtures exist; a hermetic local run passes all six browser journeys (including invitation redemption) twice in a row, all fourteen negative controls fire, and the local dump → restore → RLS rehearsal passes. The approved Vercel deployment passed the hosted read-only role journeys 3/3 and one protected booking confirmation; that synthetic fixture is now consumed, so further write-capable tests need renewed owner authorization. No live restore of pilot data has been made. Guest booking rate limits, payments, transactional email/SMS, WhatsApp Business API messaging, media storage, and operational alerting remain out of scope for the supervised pilot. See the [pilot operations runbook](docs/runbooks/pilot-operations.md), [deployment runbook](docs/runbooks/deployment.md), and [release gates](docs/release-readiness.md).
---

> **Runtime guard enforcement**: All action boundaries (onboarding, feedback, order creation, lookbook publishing) now contain explicit fail‑closed checks that refuse unresolvable ateliers or missing authorization in production. This guarantees that a user cannot trigger unintended or unsafe writes.


## Quickstart

### Prerequisites

Use Node.js 22 (the version in `.nvmrc` and `package.json#engines.node`) and npm 10 or newer.
`npm run check:node` fails if the two declarations drift apart.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The repository includes an `.npmrc` setting for the current Vite/esbuild peer-dependency mismatch so clean installs are reproducible without changing application source code.

### Quality checks

```bash
npm ci                 # Reproducible install from package-lock.json
npm run lint           # TypeScript validation
npm run test:unit      # Repository write-boundary regressions
npm run check:docs     # Relative Markdown link check
npm run build          # Production bundle
npm run verify:build   # Artifact assertions (paths and placeholders)
npm run verify:db      # Disposable postgres:16 + RLS, E2E, booking RPC and concurrency suites
npm run test:e2e       # Public-entry smoke plus configured hosted journeys
npm run preflight          # What this checkout can run, and which credentials are present
npm run test:e2e:hermetic  # Six browser journeys against a disposable local Supabase stack
npm run verify:controls    # Negative controls: each artifact/demo gate must reject its failure
npm run rehearse:restore   # Dump -> restore -> RLS rehearsal, with corrupt-archive self-controls
npm run preview        # Serve the production bundle locally
npm run audit          # Dependency vulnerability check
```

`verify:build` runs as `postbuild` on every build. In a production deploy context it requires `VITE_DATA_MODE=supabase` with configured, non-placeholder Supabase values and rejects demo identities, the demo PIN, credential cards and demo slugs; CI proves the gate rejects a demo artifact.

The supported `dev`, `build`, and `preview` scripts use `vite.pilot.config.ts`, a static SPA
configuration for Milestone 1. The root `vite.config.ts` is also a static SPA configuration; app
scripts explicitly select the pilot configuration.

## Pilot Launch

**Status: closed to real patron data.** The approved production deployment at
[stitchflow-coral.vercel.app](https://stitchflow-coral.vercel.app) is READY and passed the hosted
owner, employee, and patron read-only journeys 3/3 plus one protected booking confirmation on
2026-11-10. It is still not cleared for real pilot data: the live backup/restore rehearsal is
blocked on database credentials, the previously exposed credentials must be confirmed rotated, and
the Vercel project needs Pro before any commercial use. The hermetic local suite (6/6 twice) and the
local-source restore rehearsal pass. See [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) and
[`docs/release-readiness.md`](docs/release-readiness.md).

After those gates pass, the atelier owner signs in through **Atelier sign in**, opens the director
workspace, then uses **Fitting Queue** to select a pending request, check resource availability,
hold the selected slot, and confirm the fitting. Employee and patron accounts should be tested
against their own authorized workspaces only. Credentials must be provisioned and shared through
the approved secret manager; never put passwords in this README, issues, or evidence files. Do not
accept non-synthetic pilot data until the restore rehearsal and live tenant-isolation checks are
recorded.

### Production deployment

The app is a static Vite build. `npm run build` uses `vite.pilot.config.ts`, publishes `dist/`, and
the postbuild hook verifies the artifact. Vercel's Production environment must set
`VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`; preview
deployments use `VITE_DATA_MODE=demo`. The Vercel production context fails the build if it is
misconfigured. Production schema parity is current through `20261108173000`. Set the project's
Node.js version to `22.x` to match `.nvmrc`; `npm run check:node` guards the tracked declarations.
The approved deployment passed the hosted role journeys 3/3 and one protected booking confirmation
on 2026-11-10. See [`docs/evidence/2026-11-10_pilot-gate-reconciliation.md`](docs/evidence/2026-11-10_pilot-gate-reconciliation.md)
and the [deployment runbook](docs/runbooks/deployment.md).

## Project map

```text
src/
├── components/       Reusable UI and portal views
├── context/          Demo state, theme, role UX, and migration boundary
├── data/              Seeded atelier profiles, garments, orders, and measurements
├── types.ts           Domain contracts for the prototype
├── App.tsx            Application shell and global navigation
└── index.css          Design tokens and global styles
supabase/
└── README.md          Backend schema, access model, and verification gates
design/
├── briefs/            Measurement, production, lookbook, and booking briefs
└── directions/        Luxury atelier visual direction and design tokens
.github/workflows/     Continuous integration checks
```

## Product principles

StitchFlow is designed around the working language of African bespoke tailoring rather than a generic fashion-commerce template. The prototype preserves garment-specific measurements and cultural context while remaining smartphone-first for workshop floors. Its visual system draws from raw linen, carved ebony, Savannah gold, terracotta, and woven textiles.

## Roadmap to a real business product

Sprint 1 is partially shipped (atomic owner onboarding, invitations, audit trail). ADR-009's database layer is implemented and the booking RPCs are wired into the director workspace; its guest boundary, capacity, and legacy-inbox retirement remain open. ADR-008 (SSR shell), ADR-010 (payments ledger), and ADR-011 (tenant resolution) remain **Proposed**. Demo code and demo identities are excluded from the production artifact, and tenant-correct order writes are enforced. The next business-critical milestones are to retire the legacy `appointments` inbox; add guest rate limits and a bot challenge; version measurement cards and garment specifications; add customer CRM, fabric inventory, QC/rework, delivery, and alteration history; implement quotes, invoices, payment webhooks, tax and currency rules; and add secure media storage, privacy and consent workflows, backups with restore drills, and operational alerting. See [`docs/roadmap.md`](docs/roadmap.md).

## Contributing

Open an issue before making a substantial change so the domain model and cultural terminology stay coherent. Keep garment names, measurement semantics, and textile provenance explicit. Do not replace specialized African measurements with generic fashion fields.

Before opening a pull request, run:

```bash
npm run lint
npm run build
npm run audit
```

## License

Distributed under the Apache-2.0 license. See [LICENSE](LICENSE).

StitchFlow is built as a product experiment for African fashion designers, bespoke tailors, and couture ateliers across the continent.
