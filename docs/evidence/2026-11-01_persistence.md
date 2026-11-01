# 2026-11-01 — Persistence and fail-closed access

## Command / Step

```bash
npm run lint
VITE_SUPABASE_URL=https://example-project.supabase.co \
  VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_verification_only \
  VITE_DATA_MODE=supabase npm run build
VITE_DATA_MODE=supabase npm run verify:build
```

The Supabase values above are **non-secret synthetic values** used only to exercise the
`VITE_DATA_MODE=supabase` build branch. They are not credentials and were not used to connect to any
project.

## Observed Result

```
> tsc --noEmit
(no output — clean)

vite v8.3.5 building client environment for production...
✓ 1729 modules transformed.
✓ built in 1.27s

> node scripts/ci/verify-build.mjs
PASS: 11 build files, 8 hashed image assets, no dev-only or placeholder artifacts.
```

## Write paths wired to Supabase

Every supported action now calls a `persist*` function in `src/lib/atelier-repository.ts` when
`VITE_DATA_MODE=supabase`, and only reports success after the database accepts the write
(`saveOrToast`, `src/context/StitchFlowContext.tsx:512`). A failed write shows the error and reloads
the authenticated snapshot so local state cannot silently diverge.

| Action | Persist function | Context call |
|--------|------------------|--------------|
| Order status + progress note | `persistOrderStatus` | `StitchFlowContext.tsx:693` |
| Create order + financials + first note | `persistOrder` | `StitchFlowContext.tsx:736` |
| Artisan assignment | `persistTailorAssignment` | `StitchFlowContext.tsx:760` |
| Measurement upsert (incl. Sokoto/Buba) | `persistMeasurement` | `StitchFlowContext.tsx:778` |
| Fitting request (member or anonymous) | `persistAppointment` | `StitchFlowContext.tsx:804` |
| Appointment status | `persistAppointmentStatus` | `StitchFlowContext.tsx:817` |
| Patron feedback create | `persistFeedback` | `StitchFlowContext.tsx:836` |
| Feedback resolution | `persistFeedbackStatus` | `StitchFlowContext.tsx:847` |
| Lookbook publish | `persistLookbookItem` | `StitchFlowContext.tsx:861` |
| Atelier settings | `persistAtelierSettings` | `StitchFlowContext.tsx:556` |

Public reads: `loadPublicAtelierSnapshot` (`atelier-repository.ts:202`) loads the public atelier
profile and published lookbook for anonymous visitors, so a production visitor never sees demo data.

## Fail-closed behaviour

| Guard | Location | Effect |
|-------|----------|--------|
| Demo role sign-in | `StitchFlowContext.tsx:576` | Returns before setting a user when the mode is `supabase`. |
| Demo PIN submit | `AuthModal.tsx:81` | Refuses and shows an error in production; the demo form is not rendered (`AuthModal.tsx:160`). |
| Demo tenant switching | `StitchFlowContext.tsx:200` | Refused in production; tenant comes from the member record. |
| Demo reset | `StitchFlowContext.tsx:871` | Refused in production; destructive reset cannot touch a live atelier. |

The artifact check asserts that the production bundle contains both runtime guard strings and the
Supabase client, and that no source-path literal, placeholder host, or `service_role` marker is
present.

## Defects found and fixed

1. **`VITE_DATA_MODE=supabase` still seeded demo state into orders, measurements, appointments,
   feedback and lookbook.** A production visitor could see demo orders; the public lookbook was not
   loaded from the database. Initial state is now empty in Supabase mode and the published lookbook
   is fetched through the anonymous policy.
2. **Anonymous fitting requests could not persist.** `activeAtelierId` is null without a session and
   the demo form sent `client_id: 'cli_…'` into a uuid column. Booking now targets the public
   atelier, sends `client_id: null` for guests, and stores `client_name`/`client_phone`/`client_email`.
3. **`NGN` balances were mapped to `KES` on read.** The snapshot mapper now preserves `NGN`.
4. **Sokoto inseam and Buba chest were dropped on write and read** even though the schema models
   them. Both are now selected, typed and upserted; the African couture fields are preserved.
5. **Feedback resolution, lookbook publish and atelier settings had no persistence call.** All three
   now have `persist*` functions and are wired.
6. **Demo PIN accepted any four characters.** It now accepts only the displayed demo PIN and is
   unreachable in production.

## Verdict

**PASS** — L4 is proven: every supported action has a persistence path, the production build refuses
demo access, and the production bundle assertions pass.
