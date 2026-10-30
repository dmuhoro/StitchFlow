# StitchFlow

### A Pan-African atelier workflow prototype for bespoke tailoring

[![CI](https://github.com/dmuhoro/StitchFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/dmuhoro/StitchFlow/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

StitchFlow is a browser-based product prototype for African bespoke ateliers creating Grand Agbadas, Senator suits, Kitenge bridalwear, Kanzus, and other ceremonial garments. It brings the lookbook, fitting requests, production stages, culturally relevant measurement cards, artisan workbench, and patron updates into one warm, mobile-friendly experience.

> **Prototype boundary:** StitchFlow currently runs with seeded demo data and browser-local persistence. It is not yet a hosted multi-tenant SaaS product and must not be used to store real customer measurements, payment details, or confidential business records.

## What is included

The demo includes a cultural lookbook, a four-step fitting-request flow, an atelier director view, an artisan workbench, a patron portal, namespaced browser persistence, system/light/dark themes, KES/USD display formatting, mobile-friendly touch targets, and WhatsApp click-to-chat handoffs. Garment-specific concepts such as Agbada wingspan, Fila cap circumference, Sokoto taper, Kitenge print alignment, Kanzu robe drop, textile provenance, and posture/drape notes remain explicit in the product language and design briefs.

## Demo access

Protected views are presentation-oriented role demos, not production authentication. Select a seeded profile from the access modal to explore the Atelier Director Suite, Master Artisan Bench, or VIP Patron Portal. The demo PIN is `1234`.

Never use the demo PIN or client-side role gates as a security boundary in a live business deployment.

## Current scope and limitations

StitchFlow is intentionally a frontend prototype. It currently does **not** provide a hosted backend, shared multi-user data, server-side authentication, server-side authorization, payment processing, transactional email/SMS, WhatsApp Business API messaging, media storage, or guaranteed server-side appointment locking. Booking and workflow updates are local to the browser running the demo.

For a real atelier rollout, implement tenant isolation, managed identity, server-side RBAC, a relational database, audit events, transactional scheduling, payment reconciliation, consent and retention controls, secure media storage, notifications, backups, and monitoring before importing live customer data.

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
npm run lint       # TypeScript validation
npm run build      # Production bundle
npm run preview    # Serve the production bundle locally
npm run audit      # Dependency vulnerability check
```

### Production deployment

The app is a static Vite build. Run `npm run build` and publish `dist/` on Netlify, Cloudflare Pages, or another static host. Configure SPA fallback routing if application routes are added later.

## Project map

```text
src/
├── components/       Reusable UI and portal views
├── context/          Demo state, theme, role UX, and local persistence
├── data/              Seeded atelier profiles, garments, orders, and measurements
├── types.ts           Domain contracts for the prototype
├── App.tsx            Application shell and global navigation
└── index.css          Design tokens and global styles
design/
├── briefs/            Measurement, production, lookbook, and booking briefs
└── directions/        Luxury atelier visual direction and design tokens
.github/workflows/     Continuous integration checks
```

## Product principles

StitchFlow is designed around the working language of African bespoke tailoring rather than a generic fashion-commerce template. The prototype preserves garment-specific measurements and cultural context while remaining smartphone-first for workshop floors. Its visual system draws from raw linen, carved ebony, Savannah gold, terracotta, and woven textiles.

## Roadmap to a real business product

The next business-critical milestones are a tenant-aware relational model with migrations and audit events; managed authentication with server-enforced permissions; versioned measurement cards and garment specifications; customer CRM, fabric inventory, QC/rework, delivery, and alteration history; quotes, invoices, payment webhooks, tax and currency rules; timezone-aware transactional scheduling and reminders; secure media storage; privacy and consent workflows; backups with restore drills; and operational monitoring.

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
