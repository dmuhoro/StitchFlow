-- ----------------------------------------------------------------------------
-- CLIENT APPOINTMENT INSERTS ARE PENDING REQUESTS ONLY
-- ----------------------------------------------------------------------------
-- The status guard in 20261107210000 rejects a confirmed appointment unless the
-- protected booking store owns the slot, but it fires on UPDATE only. The insert
-- policy accepted any status, so a patron could insert `confirmed` (or
-- `completed`) with no resource booking and no staff assignment.
--
-- Narrow the policy: a client may file a pending request for their own member
-- row in their own atelier, with no staff tailor attached. Confirmation remains
-- the exclusive result of hold_slot -> confirm_booking.
--
-- The staff and anonymous boundaries are unchanged: there is no owner/employee
-- INSERT policy on appointments, and 20261107210000 revokes anonymous INSERT.
drop policy if exists appointments_client_insert_own on public.appointments;

create policy appointments_client_insert_own on public.appointments
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and public.is_atelier_member(atelier_id)
    and public.current_member_role() = 'client'
    and public.current_member_atelier_id() = atelier_id
    and status = 'pending'
    and assigned_tailor_id is null
  );
