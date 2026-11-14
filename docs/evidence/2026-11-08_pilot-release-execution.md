# 2026-11-08 — Pilot release execution

## Step 1 — Verify remote migration

### Command

```sh
CI=1 supabase migration list --remote
```

### Observed stdout/stderr

```text
Target: project StitchFlow (qkhfjlxhulekjrfgrdbz) · production
WARN: auth.email.enable_signup is deprecated and will be removed in v4, use auth.email.enabled instead.
WARN: auth.sms.enable_signup is deprecated and will be removed in v4, use auth.sms.enabled instead.
Initialising login role...
{"migrations":[{"local":"001","remote":"001","time":"001"},{"local":"20261031110000","remote":"20261031110000","time":"2026-10-31 11:00:00"},{"local":"20261031110500","remote":"20261031110500","time":"2026-10-31 11:05:00"},{"local":"20261031111000","remote":"20261031111000","time":"2026-10-31 11:10:00"},{"local":"20261031111113","remote":"20261031111113","time":"2026-10-31 11:11:13"},{"local":"20261031111200","remote":"20261031111200","time":"2026-10-31 11:12:00"},{"local":"20261031111500","remote":"20261031111500","time":"2026-10-31 11:15:00"},{"local":"20261031112000","remote":"20261031112000","time":"2026-10-31 11:20:00"},{"local":"20261031113000","remote":"20261031113000","time":"2026-10-31 11:30:00"},{"local":"20261106120000","remote":"20261106120000","time":"2026-11-06 12:00:00"},{"local":"20261106130000","remote":"20261106130000","time":"2026-11-06 13:00:00"},{"local":"20261106140000","remote":"20261106140000","time":"2026-11-06 14:00:00"},{"local":"20261106150000","remote":"20261106150000","time":"2026-11-06 15:00:00"},{"local":"20261106160000","remote":"20261106160000","time":"2026-11-06 16:00:00"},{"local":"20261107120000","remote":"20261107120000","time":"2026-11-07 12:00:00"},{"local":"20261107130000","remote":"20261107130000","time":"2026-11-07 13:00:00"},{"local":"20261107200000","remote":"20261107200000","time":"2026-11-07 20:00:00"},{"local":"20261107201000","remote":"20261107201000","time":"2026-11-07 20:10:00"},{"local":"20261107202000","remote":"20261107202000","time":"2026-11-07 20:20:00"},{"local":"20261107210000","remote":"20261107210000","time":"2026-11-07 21:00:00"},{"local":"20261107220000","remote":"20261107220000","time":"2026-11-07 22:00:00"},{"local":"20261108173000","remote":"20261108173000","time":"2026-11-08 17:30:00"}],"message":"Migrations listed","target":{"kind":"linked","project_ref":"qkhfjlxhulekjrfgrdbz","project_name":"StitchFlow","environment":"production"}}
```

### Result

Exit code 0. Production history is current through `20261108173000`; local and remote IDs match,
including `20261108173000_audit_order_financials.sql`. No migration push was needed. Supabase
emitted two deprecation warnings for the local Auth config keys shown above.

## Step 2 — Re-build and test locally

### Build — `npm run build`

Exit code 0. The artifact checker passed; Vite reported a non-blocking large-chunk advisory.

```text
> stitchflow@1.4.0-rc.2 build
> vite build --config vite.pilot.config.ts

vite v8.3.5 building client environment for production...
transforming...
✓ 1730 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                          1.80 kB │ gzip:   0.78 kB
dist/assets/agbada_aso_oke_1793438762681-CRZIoIHj.jpg  821.30 kB
dist/assets/index-Dl66UCrO.css                          55.87 kB │ gzip:  10.54 kB
dist/assets/index-CaIwEMsA.js                          670.32 kB │ gzip: 174.19 kB

✓ built in 889ms
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

> stitchflow@1.4.0-rc.2 postbuild
> node scripts/ci/verify-build.mjs

PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
```

### Database verification — `npm run verify:db`

Exit code 0. Disposable PostgreSQL verification passed, including the 14-scenario RLS suite,
15 hosted/local SQL E2E scenarios, booking RPC and staff workflow assertions, structural checks,
and 200-attempt concurrency proof (1 success, 199 unavailable, 0 duplicates). Idempotent migration
and trigger/policy setup NOTICE messages were emitted; no errors were reported.

Full stdout/stderr:

```text
> stitchflow@1.4.0-rc.2 verify:db
> bash scripts/verify-db.sh docker

==> starting disposable postgres:16 (stitchflow-verify-929967)
==> scripts/db/supabase-shim.sql
==> supabase/migrations/001_initial_schema.sql
==> supabase/migrations/20261031110000_baseline_reconciliation.sql
psql:<stdin>:40: NOTICE:  column "whatsapp_number" of relation "ateliers" already exists, skipping
psql:<stdin>:41: NOTICE:  column "default_currency" of relation "ateliers" already exists, skipping
psql:<stdin>:42: NOTICE:  column "default_unit" of relation "ateliers" already exists, skipping
psql:<stdin>:103: NOTICE:  column "specialty" of relation "members" already exists, skipping
psql:<stdin>:104: NOTICE:  column "avatar_url" of relation "members" already exists, skipping
psql:<stdin>:105: NOTICE:  column "phone" of relation "members" already exists, skipping
psql:<stdin>:106: NOTICE:  column "email" of relation "members" already exists, skipping
psql:<stdin>:127: NOTICE:  column "order_code" of relation "orders" already exists, skipping
psql:<stdin>:153: NOTICE:  column "client_email" of relation "appointments" already exists, skipping
psql:<stdin>:154: NOTICE:  column "assigned_tailor_id" of relation "appointments" already exists, skipping
psql:<stdin>:190: NOTICE:  column "is_published" of relation "lookbook_items" already exists, skipping
psql:<stdin>:344: NOTICE:  trigger "ateliers_set_updated_at" for relation "public.ateliers" does not exist, skipping
psql:<stdin>:348: NOTICE:  trigger "members_set_updated_at" for relation "public.members" does not exist, skipping
psql:<stdin>:352: NOTICE:  trigger "orders_set_updated_at" for relation "public.orders" does not exist, skipping
psql:<stdin>:356: NOTICE:  trigger "measurements_set_updated_at" for relation "public.measurements" does not exist, skipping
psql:<stdin>:360: NOTICE:  trigger "appointments_set_updated_at" for relation "public.appointments" does not exist, skipping
psql:<stdin>:364: NOTICE:  trigger "lookbook_set_updated_at" for relation "public.lookbook_items" does not exist, skipping
==> supabase/migrations/20261031110500_security_hardening.sql
psql:<stdin>:37: NOTICE:  trigger "prevent_order_tenant_reassignment" for relation "public.orders" does not exist, skipping
psql:<stdin>:45: NOTICE:  policy "orders_member_read" for relation "public.orders" does not exist, skipping
psql:<stdin>:46: NOTICE:  policy "orders_staff_insert" for relation "public.orders" does not exist, skipping
psql:<stdin>:47: NOTICE:  policy "orders_staff_update" for relation "public.orders" does not exist, skipping
psql:<stdin>:48: NOTICE:  policy "orders_owner_delete" for relation "public.orders" does not exist, skipping
psql:<stdin>:72: NOTICE:  policy "progress_member_read" for relation "public.order_progress_notes" does not exist, skipping
psql:<stdin>:73: NOTICE:  policy "progress_staff_insert" for relation "public.order_progress_notes" does not exist, skipping
psql:<stdin>:74: NOTICE:  policy "progress_staff_update" for relation "public.order_progress_notes" does not exist, skipping
psql:<stdin>:92: NOTICE:  policy "measurements_member_read" for relation "public.measurements" does not exist, skipping
psql:<stdin>:93: NOTICE:  policy "measurements_staff_insert" for relation "public.measurements" does not exist, skipping
psql:<stdin>:94: NOTICE:  policy "measurements_staff_update" for relation "public.measurements" does not exist, skipping
psql:<stdin>:116: NOTICE:  policy "appointments_member_read" for relation "public.appointments" does not exist, skipping
psql:<stdin>:117: NOTICE:  policy "appointments_member_insert" for relation "public.appointments" does not exist, skipping
psql:<stdin>:118: NOTICE:  policy "appointments_staff_update" for relation "public.appointments" does not exist, skipping
psql:<stdin>:119: NOTICE:  policy "appointments_owner_delete" for relation "public.appointments" does not exist, skipping
psql:<stdin>:129: NOTICE:  policy "lookbook_public_read" for relation "public.lookbook_items" does not exist, skipping
psql:<stdin>:130: NOTICE:  policy "lookbook_staff_read" for relation "public.lookbook_items" does not exist, skipping
==> supabase/migrations/20261031111000_security_advisor_cleanup.sql
==> supabase/migrations/20261031111113_direct_uid_rls_preflight.sql
==> supabase/migrations/20261031111200_revoke_public_function_execute.sql
==> supabase/migrations/20261031111500_direct_uid_rls.sql
psql:<stdin>:4: NOTICE:  column "created_by" of relation "ateliers" already exists, skipping
psql:<stdin>:11: NOTICE:  policy "ateliers_member_read" for relation "public.ateliers" does not exist, skipping
psql:<stdin>:12: NOTICE:  policy "ateliers_owner_update" for relation "public.ateliers" does not exist, skipping
psql:<stdin>:13: NOTICE:  policy "members_member_read" for relation "public.members" does not exist, skipping
psql:<stdin>:14: NOTICE:  policy "members_owner_insert" for relation "public.members" does not exist, skipping
psql:<stdin>:15: NOTICE:  policy "members_owner_update" for relation "public.members" does not exist, skipping
psql:<stdin>:17: NOTICE:  policy "lookbook_staff_read" for relation "public.lookbook_items" does not exist, skipping
psql:<stdin>:18: NOTICE:  policy "lookbook_staff_insert" for relation "public.lookbook_items" does not exist, skipping
psql:<stdin>:19: NOTICE:  policy "lookbook_staff_update" for relation "public.lookbook_items" does not exist, skipping
psql:<stdin>:20: NOTICE:  policy "lookbook_owner_delete" for relation "public.lookbook_items" does not exist, skipping
psql:<stdin>:49: NOTICE:  policy "feedback_member_read" for relation "public.feedback" does not exist, skipping
psql:<stdin>:50: NOTICE:  policy "feedback_client_insert" for relation "public.feedback" does not exist, skipping
psql:<stdin>:51: NOTICE:  policy "feedback_owner_update" for relation "public.feedback" does not exist, skipping
==> supabase/migrations/20261031112000_rls_final.sql
psql:<stdin>:133: NOTICE:  trigger "prevent_atelier_creator_reassignment" for relation "public.ateliers" does not exist, skipping
psql:<stdin>:162: NOTICE:  trigger "guard_member_mutation" for relation "public.members" does not exist, skipping
==> supabase/migrations/20261031113000_currency_alignment.sql
psql:<stdin>:21: NOTICE:  constraint "ateliers_default_currency_check" of relation "ateliers" does not exist, skipping
==> supabase/migrations/20261106120000_sprint1_audit_log.sql
psql:<stdin>:52: NOTICE:  trigger "audit_orders_trigger" for relation "public.orders" does not exist, skipping
psql:<stdin>:57: NOTICE:  trigger "audit_measurements_trigger" for relation "public.measurements" does not exist, skipping
==> supabase/migrations/20261106130000_sprint1_invitations.sql
==> supabase/migrations/20261106140000_sprint1_invite_accept.sql
==> supabase/migrations/20261106150000_sprint1_hardening.sql
psql:<stdin>:239: NOTICE:  trigger "audit_ateliers_trigger" for relation "public.ateliers" does not exist, skipping
psql:<stdin>:244: NOTICE:  trigger "audit_members_trigger" for relation "public.members" does not exist, skipping
==> supabase/migrations/20261106160000_atomic_owner_onboarding.sql
==> supabase/migrations/20261107120000_booking_engine.sql
psql:<stdin>:54: NOTICE:  trigger "booking_resources_set_updated_at" for relation "public.booking_resources" does not exist, skipping
psql:<stdin>:88: NOTICE:  trigger "availability_rules_set_updated_at" for relation "public.resource_availability_rules" does not exist, skipping
psql:<stdin>:122: NOTICE:  trigger "blackout_dates_set_updated_at" for relation "public.blackout_dates" does not exist, skipping
psql:<stdin>:192: NOTICE:  trigger "bookings_set_updated_at" for relation "public.bookings" does not exist, skipping
psql:<stdin>:198: NOTICE:  trigger "audit_bookings_trigger" for relation "public.bookings" does not exist, skipping
==> supabase/migrations/20261107130000_booking_staff_slice.sql
==> supabase/migrations/20261107200000_add_audit_log.sql
psql:<stdin>:65: NOTICE:  trigger "trg_member_change" for relation "public.members" does not exist, skipping
==> supabase/migrations/20261107201000_owner_invitation_permissions.sql
psql:<stdin>:22: NOTICE:  trigger "trg_check_owner_creation" for relation "public.invitations" does not exist, skipping
psql:<stdin>:44: NOTICE:  trigger "trg_prevent_last_owner_demotion" for relation "public.members" does not exist, skipping
==> supabase/migrations/20261107202000_add_source_to_appointments.sql
==> supabase/migrations/20261107210000_guard_appointment_booking_status.sql
psql:<stdin>:66: NOTICE:  trigger "appointments_guard_booking_status" for relation "public.appointments" does not exist, skipping
psql:<stdin>:101: NOTICE:  trigger "bookings_sync_appointment_status" for relation "public.bookings" does not exist, skipping
==> supabase/migrations/20261107220000_restrict_client_appointment_insert.sql
==> supabase/migrations/20261108173000_audit_order_financials.sql
psql:<stdin>:77: NOTICE:  trigger "audit_order_financials_trigger" for relation "public.order_financials" does not exist, skipping
==> supabase/seed.sql
==> supabase/tests/rls_isolation_test.sql
psql:<stdin>:87: NOTICE:  PASS [1] owner order isolation: own=3, leaked=0
psql:<stdin>:103: NOTICE:  PASS [2] cross-tenant write isolation: rows mutated=0
psql:<stdin>:144: NOTICE:  PASS [3] artisan scope: assigned=3, otherOrders=0, otherMeasurements=0, financials=0, financialAudit=0, members=4
psql:<stdin>:219: NOTICE:  PASS [4] patron scope: measurements=1, orders=2, appointments=1, balances=2, clients=1, staff=2
psql:<stdin>:252: NOTICE:  PASS [5] public perimeter: published=3, drafts=0, orders=0, members=0, ateliers=2
psql:<stdin>:289: NOTICE:  PASS [6] anonymous appointment writes denied pending rate-limited edge boundary
psql:<stdin>:308: NOTICE:  PASS [7] cross-tenant order update: rows mutated=0
psql:<stdin>:333: NOTICE:  PASS [8] cross-tenant insert denied by WITH CHECK
psql:<stdin>:354: NOTICE:  PASS [9] patron self role escalation blocked
psql:<stdin>:390: NOTICE:  PASS [10] deactivated member access revoked: orders=0, measurements=0
psql:<stdin>:422: NOTICE:  PASS [11] patron write denial: orders=0, financials=0, measurements=0
psql:<stdin>:483: NOTICE:  PASS [12] tenant-id mutation guards: blocked=3
psql:<stdin>:544: NOTICE:  PASS [13] patron appointment insert is own-tenant pending request only
psql:<stdin>:568: NOTICE:  PASS [14] owner cannot use patron pending-request insert policy
==> supabase/tests/hosted_rls_e2e.sql
psql:<stdin>:59: NOTICE:  PASS [E2E-1] owner onboarding is atomic and refuses a second atelier
psql:<stdin>:87: NOTICE:  PASS [E2E-2] both ateliers exist with exactly one owner membership each
psql:<stdin>:161: NOTICE:  PASS [E2E-3] Owner A isolation: own=1, otherOrders=0, otherMeasurements=0, tenantScoped=0
psql:<stdin>:176: NOTICE:  PASS [E2E-3a] duplicate order_code update affected only the owner tenant
psql:<stdin>:199: NOTICE:  PASS [E2E-4] Owner B isolation: own=1, otherOrders=0, otherMeasurements=0
psql:<stdin>:224: NOTICE:  PASS [E2E-5] artisan scope: assigned=1, otherTenant=0, financials=0, measurements=0
psql:<stdin>:258: NOTICE:  PASS [E2E-6] patron scope: ownOrders=1, ownMeasurements=1, ownBalance=1, leaks=0
psql:<stdin>:285: NOTICE:  PASS [E2E-7] anonymous perimeter: orders=0, members=0, financials=0, measurements=0
psql:<stdin>:297: NOTICE:  PASS [E2E-8] anonymous invitation lookup denied
psql:<stdin>:345: NOTICE:  PASS [E2E-9] owner cannot invite into another tenant
psql:<stdin>:358: NOTICE:  PASS [E2E-10] invitation is bound to the invited email
psql:<stdin>:371: NOTICE:  PASS [E2E-11] invited patron redeemed the invitation
psql:<stdin>:387: NOTICE:  PASS [E2E-12] redemption created a client membership in Tenant A and consumed the invite
psql:<stdin>:417: NOTICE:  PASS [E2E-13] invitation redemption assigns employee and client roles correctly
psql:<stdin>:449: NOTICE:  PASS [E2E-14] audit trail: atelierRows=2, memberRows=14
psql:<stdin>:471: NOTICE:  PASS [E2E-15] order tenant reassignment blocked
==> supabase/tests/booking_engine_test.sql
psql:<stdin>:89: NOTICE:  PASS [B1] client hold: booking=b71993c1-c65f-4f4d-a94e-47dc276c386f, status=held
psql:<stdin>:108: NOTICE:  PASS [B2] no availability rule refuses the hold
psql:<stdin>:127: NOTICE:  PASS [B3] blackout refuses the hold
psql:<stdin>:148: NOTICE:  PASS [B4] cross-tenant hold refused
psql:<stdin>:177: NOTICE:  PASS [B5] client role limits: another patron and guest both refused
psql:<stdin>:211: NOTICE:  PASS [B7] staff hold for a tenant patron
psql:<stdin>:258: NOTICE:  PASS [B8] anonymous RPC execute denied: 4 of 4
psql:<stdin>:305: NOTICE:  PASS [B9] anonymous table perimeter closed
psql:<stdin>:390: NOTICE:  PASS [B10] patron table scope and write denial
psql:<stdin>:422: NOTICE:  PASS [B11] cross-tenant confirm/cancel/reschedule denied
psql:<stdin>:467: NOTICE:  PASS [B12] owner staff scope, direct booking writes denied
psql:<stdin>:495: NOTICE:  PASS [B13] confirm: wrong token refused, valid token confirmed, replay stable
psql:<stdin>:525: NOTICE:  PASS [B16] cancel idempotent; cancelled range released
psql:<stdin>:586: NOTICE:  PASS [B17] expired hold refused and swept inside the hold transaction
psql:<stdin>:639: NOTICE:  PASS [B18] reschedule moves atomically and replays idempotently
psql:<stdin>:680: NOTICE:  PASS [B19] reschedule conflict refused and original range preserved
psql:<stdin>:773: NOTICE:  PASS [B20] replay rotates the token; old token invalid; mismatch conflicts
psql:<stdin>:795: NOTICE:  PASS [B21] patron-to-patron cancel/reschedule denied
psql:<stdin>:811: NOTICE:  PASS [B22] staff can cancel a tenant booking
psql:<stdin>:838: NOTICE:  PASS [B23] exclusion constraint shape: EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE ((status = ANY (ARRAY['held'::text, 'confirmed'::text])))
==> supabase/tests/booking_staff_slice_test.sql
psql:<stdin>:123: NOTICE:  PASS [S1] appointment link and tenant FK; anonymous insert remains disabled
psql:<stdin>:152: NOTICE:  PASS [S2a] availability projects three rule-bounded slots
psql:<stdin>:180: NOTICE:  PASS [S2b] blackout subtracts overlapping slots
psql:<stdin>:214: NOTICE:  PASS [S2c] live hold removes exactly its slot
psql:<stdin>:242: NOTICE:  PASS [S2d] expired hold counts as free
psql:<stdin>:280: NOTICE:  PASS [S2e] no rules, oversized range, invalid slot length all fail closed
psql:<stdin>:300: NOTICE:  PASS [S2f] cross-tenant availability refused
psql:<stdin>:330: NOTICE:  PASS [S2g] anonymous availability and sweep execute denied
psql:<stdin>:368: NOTICE:  PASS [S3a] authenticated cannot execute the global sweep
psql:<stdin>:400: NOTICE:  PASS [S3b] service_role sweep expired=1 and scrubbed the ledger token
psql:<stdin>:424: NOTICE:  PASS [S4-guard] direct confirmation without a booking is refused
psql:<stdin>:461: NOTICE:  PASS [S4a] pending request links to a held booking and supplies contact details
psql:<stdin>:480: NOTICE:  PASS [S4b] one live booking per request
psql:<stdin>:507: NOTICE:  PASS [S4c] confirmation does not reopen the request
psql:<stdin>:539: NOTICE:  PASS [S4d] cross-tenant and completed requests refused
psql:<stdin>:569: NOTICE:  PASS [S4e] cancellation releases the request and the slot
psql:<stdin>:602: NOTICE:  PASS [S5a] occupied slot returns slot_unavailable
psql:<stdin>:623: NOTICE:  PASS [S5b] confirmed booking subtracts its slot from availability
psql:<stdin>:643: NOTICE:  PASS [S6a] owner creates resource and weekly availability atomically
psql:<stdin>:657: NOTICE:  PASS [S6b] patron cannot provision a booking resource
psql:<stdin>:736: NOTICE:  PASS [S7a] client can file a pending request
psql:<stdin>:736: NOTICE:  PASS [S7b] client cannot insert a confirmed appointment
psql:<stdin>:736: NOTICE:  PASS [S7c] client cannot assign a staff tailor
psql:<stdin>:764: NOTICE:  PASS [S7d] anonymous appointment insert remains closed
==> concurrency fixture (resource c0000001-0001-4001-8001-000000000001)
==> 200 attempts, 50 in flight
attempts=200 success=1 slot_unavailable=199 other=0
PASS [booking] concurrency: attempts=200 success=1 slot_unavailable=199 live_rows=1 duplicates=0
==> structural assertions
NOTICE:  RLS enabled on every public table; 16 public tables present.
==> database verification passed
```

### Unit tests — `npm run test:unit`

Exit code 0.

```text
> stitchflow@1.4.0-rc.2 test:unit
> vitest run --config vitest.config.ts

RUN  v4.1.12 /home/daniel-muhoro/workspace/projects/StitchFlow

Test Files  1 passed (1)
Tests  3 passed (3)
Start at 21:49:51
Duration 603ms (transform 137ms, setup 0ms, import 179ms, tests 25ms, environment 0ms)
```

### Type check — `npm run lint`

Exit code 0.

```text
> stitchflow@1.4.0-rc.2 lint
> tsc --noEmit
```

### Documentation links — `npm run check:docs`

Exit code 0.

```text
> stitchflow@1.4.0-rc.2 check:docs
> node scripts/ci/check-doc-links.mjs

PASS: 150 relative Markdown links resolve across 96 files.
```

## Step 3 — Bootstrap Vercel production-configured build

### Environment listing — `vercel env ls production`

Exit code 0. Production entries are configured for `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_URL`, and `VITE_DATA_MODE`. The CLI output displayed masked value previews; those
values are intentionally omitted from this evidence. The CLI also warned that the positional
environment argument is deprecated in favor of `--environment`.

```text
Vercel CLI 65.12.1
! The environment argument is deprecated. Use --environment.
> Environment Variables found [account/project identifiers omitted]

 name                               value            type      environments        created
 VITE_SUPABASE_PUBLISHABLE_KEY      ***REDACTED***   Config    Production          9h ago
 VITE_SUPABASE_URL                  ***REDACTED***   Config    Production          9h ago
 VITE_DATA_MODE                     ***REDACTED***   Config    Production          9h ago

Next steps:
- Add an Environment Variable:
  vercel env add
- Remove an Environment Variable:
  vercel env remove
- Pull Development Environment Variables into .env.local:
  vercel env pull
```

### Pull environment — `vercel pull --environment=production --yes`

Exit code 0. The CLI updated the ignored `.vercel/.env.production.local` and project settings.
Its output noted that `VERCEL_OIDC_TOKEN` was updated; no value is included here.

```text
Vercel CLI 65.12.1
> Overwriting existing .vercel/.env.production.local file
> Downloading `production` environment variables

  Changes:
  + VERCEL_OIDC_TOKEN (Updated)

✓ Updated .vercel/.env.production.local file

> Downloading project settings
Downloaded project settings to [local project path omitted]/.vercel/project.json [0ms]
```

### Production artifact — `vercel build --prod`

Exit code 0. Vercel built the local production artifact and the postbuild artifact check passed.
`npm ci` reported 0 vulnerabilities. Vite emitted its non-blocking large-chunk advisory.

```text
Vercel CLI 65.12.1
Running "install" command: `npm ci`...

added 87 packages, and audited 88 packages in 6s
22 packages are looking for funding
found 0 vulnerabilities

> stitchflow@1.4.0-rc.2 build
> vite build --config vite.pilot.config.ts

vite v8.3.5 building client environment for production...
transforming...
✓ 1730 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                          1.80 kB │ gzip:   0.78 kB
dist/assets/agbada_aso_oke_1793438762681-CRZIoIHj.jpg  821.30 kB
dist/assets/index-Dl66UCrO.css                          55.87 kB │ gzip:  10.54 kB
dist/assets/index-CaIwEMsA.js                          670.32 kB │ gzip: 174.19 kB

[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 989ms

> stitchflow@1.4.0-rc.2 postbuild
> node scripts/ci/verify-build.mjs

PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
{
  "status": "ok",
  "outputDir": ".vercel/output",
  "outputDirRelative": ".vercel/output",
  "target": "production",
  "message": "Build completed successfully.",
  "next": [{"command": "vercel deploy", "when": "Deploy the build output"}]
}
```

### Artifact assertion — `node scripts/ci/verify-build.mjs`

Exit code 0.

```text
PASS: 4 build files, 1 hashed image assets, no dev-only or placeholder artifacts.
```

All Step 3 commands passed. Masked environment previews and token values are excluded from this
record.

## Step 4 — Full E2E against pulled artifact

### Preview server — `vercel preview --port 4174`

Exit code 2. Vercel CLI 65.12.1 returned an `unknown_command` error: `Unknown command "preview"`.
The follow-up curl probe to port 4174 exited 7 (`HTTP 000`, connection refused). Full diagnostic
excerpt and curl output are in
[`2026-11-08_pilot-e2e-failure.md`](./2026-11-08_pilot-e2e-failure.md).
Playwright did not run; no screenshot or trace was generated.

**STOP — Step 4 failed.** Per the requested stop-on-first-failure rule, steps 5–8 were not run.
No tag or push was made.
