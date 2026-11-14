# Evidence: Booking staff slice + audit/owner/source migrations

Date: 2026-11-07

Gates passed:
- `npm run verify:db` (docker) — full chain including 20261107130000/20200000/201000, RLS suite, booking RLS/concurrency PASS.

Migrations:
- `20261107130000_booking_staff_slice.sql` (availability/get_availability, staff slice)
- `20261107200000_add_audit_log.sql` (audit_log reuse + members trigger)
- `20261107201000_owner_invitation_permissions.sql` (owner-only invites, last-owner guard)
- `20261107202000_add_source_to_appointments.sql`

Tests:
- `supabase/tests/booking_staff_slice_test.sql` (S1–S4 scenarios)

Status: DB layer green.
