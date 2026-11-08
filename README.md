# StitchFlow

### A Pan-African atelier workflow prototype for bespoke tailoring

[![CI](https://github.com/dmuhoro/StitchFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/dmuhoro/StitchFlow/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

StitchFlow is a browser-based product prototype for African bespoke ateliers creating Grand Agbadas, Senator suits, Kitenge bridalwear, Kanzus, and other ceremonial garments. It brings the lookbook, fitting requests, production stages, culturally relevant measurement cards, artisan workbench, and patron updates into one warm, mobile-friendly experience.

> **Verification status (2026-11-08):** `v1.4.0-rc.1` records the locally verified booking
> workflow, booking status guards, and production bundle gate. The local suite passes 14 RLS
> scenarios, 15 SQL E2E scenarios, booking tests, staff tests, and the 200-attempt concurrency
> proof. The hosted project still needs migration-history reconciliation and hosted browser role
> flows before live booking. See the [release evidence](docs/evidence/2026-11-08_v1.4.0-rc.1.md)
> and [release gates](docs/release-readiness.md).

## What is included

The demo includes a cultural lookbook, a four-step fitting-request flow, an atelier director view, an artisan workbench, a patron portal, namespaced browser persistence, system/light/dark themes, KES/USD display formatting, mobile-friendly touch targets, and WhatsApp click-to-chat handoffs. Garment-specific concepts such as Agbada wingspan, Fila cap circumference, Sokoto taper, Kitenge print alignment, Kanzu robe drop, textile provenance, and posture/drape notes remain explicit in the product language and design briefs.

## Demo access

Protected views are presentation-oriented role demos, not production authentication. Select a seeded profile from the access modal to explore the Atelier Director Suite, Master Artisan Bench, or VIP Patron Portal. The demo PIN is `1234`.

Never use the demo PIN or client-side role gates as a security boundary in a live business deployment.

## Supabase backend foundation

The connected Supabase project contains tenant-aware tables for ateliers, members, lookbook items, orders, order progress notes, measurements, appointments, feedback, the booking engine (`booking_resources`, `resource_availability_rules`, `blackout_dates`, `bookings`, `idempotency_keys`), `audit_log`, and `invitations`. Row Level Security is enabled on every public table. Staff access is scoped to an atelier, patrons are scoped to their own records, and only published lookbook items are public. The browser integration lives in `src/lib/supabase.ts` and `src/lib/atelier-repository.ts`; backend notes and verification gates are documented in [supabase/README.md](supabase/README.md).

The local suite has 14 adversarial RLS scenarios, 15 hosted/local E2E scenarios, a booking RPC suite (B1–B23), and a staff booking slice (S1–S7). The `bookings` store is protected by a GiST exclusion constraint and four RPC-only write paths. `appointments` is now a request inbox: a client may insert only an own-tenant pending request with no assigned tailor, anonymous inserts are revoked, and a database trigger refuses a confirmed or completed status unless a linked protected booking is confirmed. Pending requests can share a requested time because they are proposals, not reserved resource time. Retiring the legacy inbox in favour of the booking store remains ADR-009 §8 work.

Copy `.env.example` to `.env.local` and provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `VITE_DATA_MODE=demo` until Supabase Auth and the first owner onboarding flow have been tested. Never place a service-role key in Vite environment variables or browser code.

## Current scope and limitations

StitchFlow is still a staged production migration. Demo mode remains the default local surface. The Supabase-mode bundle excludes demo identities and the demo PIN, and a production deploy now fails closed if it is built in demo mode. The booking UI uses the protected hold/confirm/cancel RPCs, and client appointment inserts are limited to own-tenant pending requests. Tenant resolution is still client-side, order writes locate rows by `order_code` alone, and owner money-edit audit coverage is incomplete. Hosted schema parity, hosted role journeys, guest booking rate limits, payments, transactional email/SMS, WhatsApp Business API messaging, media storage, and operational monitoring remain to be integrated and verified. Findings and priorities remain in the [Sprint 0 audit](docs/audit/2026-11-05_sprint-0-audit.md).
---

> **Runtime guard enforcement**: All action boundaries (onboarding, feedback, order creation, lookbook publishing) now contain explicit fail‑closed checks that refuse unresolvable ateliers or missing authorization in production. This guarantees that a user cannot trigger unintended or unsafe writes.


## Quickstart

### Prerequisites

Use Node.js 20 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The repository includes an `.npmrc` setting for the current Vite/esbuild peer-dependency mismatch so clean installs are reproducible without changing application source code.

### Quality checks

```bash
npm ci                 # Reproducible install from package-lock.json
npm run lint           # TypeScript validation
npm run check:docs     # Relative Markdown link check
npm run build          # Production bundle
npm run verify:build   # Artifact assertions (paths and placeholders)
npm run verify:db      # Disposable postgres:16 + RLS, E2E, booking RPC and concurrency suites
npm run preview        # Serve the production bundle locally
npm run audit          # Dependency vulnerability check
```

`verify:build` runs as `postbuild` on every build. In a production deploy context it requires `VITE_DATA_MODE=supabase` with configured, non-placeholder Supabase values and rejects demo identities, the demo PIN, credential cards and demo slugs; CI proves the gate rejects a demo artifact.

### Production deployment

The app is a static Vite build. `npm run build` publishes `dist/`, and `postbuild` verifies the artifact. A production deploy must set `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`; `netlify.toml` sets the production context to Supabase mode, and a demo-mode production build fails the gate. Use a deploy preview for a demo walkthrough. Configure SPA fallback routing if application routes are added later.

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

Sprint 1 is partially shipped (atomic owner onboarding, invitations, audit trail). ADR-009's database layer is now implemented; its UI wiring, guest boundary, capacity, and legacy-store retirement remain open. ADR-008 (SSR shell), ADR-010 (payments ledger), and ADR-011 (tenant resolution) remain **Proposed**. The next business-critical milestones are to remove demo code from the production artifact; enforce tenant-correct order writes; wire the booking RPCs into the UI and retire the legacy `appointments` path; add guest rate limits and a bot challenge; version measurement cards and garment specifications; add customer CRM, fabric inventory, QC/rework, delivery, and alteration history; implement quotes, invoices, payment webhooks, tax and currency rules; and add secure media storage, privacy and consent workflows, backups with restore drills, and operational monitoring. See [`docs/roadmap.md`](docs/roadmap.md).

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
