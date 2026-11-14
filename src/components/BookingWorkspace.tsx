import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStitchFlow } from '../context/StitchFlowContext';
import {
  AtelierBooking,
  BookingResource,
  cancelBooking,
  confirmBooking,
  createBookingResource,
  getAvailability as fetchAvailability,
  holdSlot,
  listAtelierBookings,
  listBookingResources,
} from '../lib/atelier-booking-repository';
import { Appointment } from '../types';
import { AvailabilitySlot } from '../types/booking';
import { emit } from '../lib/telemetry';

const serviceMinutes: Record<Appointment['service_type'], number> = {
  grand_agbada: 45,
  ruracio_bridal: 60,
  senator_kaftan: 45,
  kitenge_wax_styling: 30,
  basted_fitting: 45,
  final_collection: 30,
};

function dateInTimezone(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function timeInTimezone(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}

function utcSearchRange(day: string): [Date, Date] {
  const midnight = new Date(`${day}T00:00:00.000Z`);
  return [new Date(midnight.getTime() - 36 * 60 * 60 * 1000), new Date(midnight.getTime() + 60 * 60 * 60 * 1000)];
}

export const BookingWorkspace: React.FC = () => {
  const { appointments, currentAtelier, currentUser, isSupabaseMode, showToast, refreshAtelier } = useStitchFlow();
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [bookings, setBookings] = useState<AtelierBooking[]>([]);
  const [resourceId, setResourceId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotStart, setSlotStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceName, setResourceName] = useState('');
  const [resourceKind, setResourceKind] = useState<BookingResource['kind']>('fitting_room');
  const [timezone, setTimezone] = useState('Africa/Nairobi');
  const [startsAt, setStartsAt] = useState('09:00');
  const [endsAt, setEndsAt] = useState('18:00');
  const idempotencyKeys = useRef(new Map<string, string>());

  const pendingRequests = useMemo(() => appointments.filter(item => item.status === 'pending'), [appointments]);
  const selectedAppointment = pendingRequests.find(item => item.id === appointmentId);
  const selectedResource = resources.find(item => item.id === resourceId);
  const duration = selectedAppointment ? serviceMinutes[selectedAppointment.service_type] : 60;

  const refreshBookingData = useCallback(async () => {
    if (!currentAtelier.id || !isSupabaseMode) return;
    const [nextResources, nextBookings] = await Promise.all([
      listBookingResources(currentAtelier.id),
      listAtelierBookings(currentAtelier.id),
    ]);
    setResources(nextResources);
    setBookings(nextBookings);
    setResourceId(previous => nextResources.some(resource => resource.id === previous) ? previous : (nextResources[0]?.id ?? ''));
  }, [currentAtelier.id, isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode || !currentAtelier.id) return;
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([listBookingResources(currentAtelier.id), listAtelierBookings(currentAtelier.id)])
      .then(([nextResources, nextBookings]) => {
        if (!active) return;
        setResources(nextResources);
        setBookings(nextBookings);
        setResourceId(previous => nextResources.some(resource => resource.id === previous) ? previous : (nextResources[0]?.id ?? ''));
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load the booking workspace.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentAtelier.id, isSupabaseMode]);

  useEffect(() => {
    if (!selectedAppointment || !selectedResource) return;
    setDay(dateInTimezone(selectedAppointment.slot_datetime, selectedResource.timezone));
    setSlotStart('');
  }, [appointmentId, resourceId]);

  useEffect(() => {
    if (!isSupabaseMode || !currentAtelier.id || !selectedResource || !day || !selectedAppointment) {
      setSlots([]);
      return;
    }
    let active = true;
    const [from, to] = utcSearchRange(day);
    setLoading(true);
    setError(null);
    fetchAvailability(currentAtelier.id, selectedResource.id, from, to, duration)
      .then(response => {
        if (!active) return;
        if (response.error) throw new Error(response.error);
        const nextSlots = (response.slots ?? []).filter(slot => dateInTimezone(slot.start, selectedResource.timezone) === day);
        setSlots(nextSlots);
        setSlotStart(previous => nextSlots.some(slot => slot.start === previous) ? previous : '');
      })
      .catch(caught => {
        if (active) {
          setSlots([]);
          setError(caught instanceof Error ? caught.message : 'Unable to load available fitting times.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentAtelier.id, day, duration, isSupabaseMode, selectedAppointment, selectedResource]);

  const confirmRequest = async () => {
    if (!selectedAppointment || !selectedResource || !slotStart || !currentAtelier.id) return;
    const slot = slots.find(candidate => candidate.start === slotStart);
    if (!slot) return;
    setBusy(true);
    setError(null);
    const keyScope = `${selectedAppointment.id}:${selectedResource.id}:${slot.start}`;
    let idempotencyKey = idempotencyKeys.current.get(keyScope);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      idempotencyKeys.current.set(keyScope, idempotencyKey);
    }
    try {
      const hold = await holdSlot({
        atelierId: currentAtelier.id,
        resourceId: selectedResource.id,
        during: [slot.start, slot.end],
        serviceType: selectedAppointment.service_type,
        clientId: selectedAppointment.client_id ?? undefined,
        clientName: selectedAppointment.client_name,
        clientPhone: selectedAppointment.client_phone,
        clientEmail: selectedAppointment.client_email,
        culturalOccasion: selectedAppointment.cultural_occasion,
        notes: selectedAppointment.notes,
        appointmentId: selectedAppointment.id,
        idempotencyKey,
      });
      if (hold.error) throw new Error(hold.error);
      if (!hold.hold_token) {
        if (hold.status === 'confirmed') {
          await refreshAtelier();
          await refreshBookingData();
          showToast('This request already has a confirmed fitting.');
          return;
        }
        throw new Error('The booking service did not return a hold token.');
      }
      const confirmed = await confirmBooking(hold.hold_token);
      if (confirmed.error) throw new Error(confirmed.error);
      if (confirmed.status !== 'confirmed') throw new Error('The fitting was not confirmed by the booking service.');

      // Only a confirmed booking counts; a hold or a failed confirm must not
      // reach the funnel.
      emit('booking_confirmed', { data_mode: 'supabase', outcome: 'success' });

      idempotencyKeys.current.delete(keyScope);
      await refreshAtelier();
      await refreshBookingData();
      showToast('Fitting confirmed and the resource slot is reserved.');
      setSlotStart('');
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Unable to confirm this fitting.';
      setError(detail);
      showToast(`Fitting was not confirmed: ${detail}`);
      await refreshBookingData().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const cancelConfirmedBooking = async (booking: AtelierBooking) => {
    setBusy(true);
    setError(null);
    try {
      const result = await cancelBooking(booking.id);
      if (result.error) throw new Error(result.error);
      await refreshAtelier();
      await refreshBookingData();
      showToast('Fitting cancelled and its resource slot released.');
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Unable to cancel this fitting.';
      setError(detail);
      showToast(`Fitting was not cancelled: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const addResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentAtelier.id || currentUser?.role !== 'owner') return;
    setBusy(true);
    setError(null);
    try {
      const created = await createBookingResource({
        atelierId: currentAtelier.id,
        kind: resourceKind,
        displayName: resourceName,
        timezone,
        startsAt,
        endsAt,
      });
      setResourceName('');
      await refreshBookingData();
      setResourceId(created.id);
      showToast(`${created.display_name} is ready for fittings.`);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Unable to create this booking resource.';
      setError(detail);
      showToast(`Resource was not created: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseMode) return null;

  return (
    <section className="rounded-3xl border border-[#E5DACB] bg-white p-5 shadow-sm dark:border-[#332C27] dark:bg-[#1C1917] space-y-5">
      <header>
        <h4 className="font-display text-lg font-bold text-[#161311] dark:text-[#F5EFE6]">Protected fitting bookings</h4>
        <p className="mt-1 text-xs text-[#6A5D52] dark:text-[#B8ABA0]">
          Requests become confirmed only after an available resource slot is held and confirmed.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-[#6A5D52]">Loading current availability…</p>}

      {resources.length === 0 && currentUser?.role === 'owner' && (
        <form onSubmit={addResource} className="rounded-2xl border border-[#E5DACB] bg-[#FAF6F0] p-4 space-y-3 dark:border-[#332C27] dark:bg-[#24201D]">
          <div>
            <h5 className="text-sm font-bold">Set up your first fitting resource</h5>
            <p className="text-xs text-[#6A5D52]">This creates the resource and its Monday–Saturday availability together.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium">Resource name
              <input required value={resourceName} onChange={event => setResourceName(event.target.value)} placeholder="Main fitting room" className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium">Resource type
              <select value={resourceKind} onChange={event => setResourceKind(event.target.value as BookingResource['kind'])} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm">
                <option value="fitting_room">Fitting room</option><option value="fitter">Fitter</option><option value="cutter">Cutter</option><option value="workshop">Workshop</option>
              </select>
            </label>
            <label className="text-xs font-medium">Timezone
              <input required value={timezone} onChange={event => setTimezone(event.target.value)} placeholder="Africa/Nairobi" className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium">Opens
                <input required type="time" value={startsAt} onChange={event => setStartsAt(event.target.value)} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium">Closes
                <input required type="time" value={endsAt} onChange={event => setEndsAt(event.target.value)} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
              </label>
            </div>
          </div>
          <button disabled={busy} className="rounded-xl bg-[#161311] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Create resource and availability</button>
        </form>
      )}

      {pendingRequests.length > 0 && resources.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div className="space-y-2">
            <h5 className="text-sm font-bold">Pending fitting requests</h5>
            {pendingRequests.map(request => (
              <button key={request.id} type="button" onClick={() => setAppointmentId(request.id)} className={`w-full rounded-2xl border p-3 text-left ${appointmentId === request.id ? 'border-[#8C6D2D] bg-[#FAF6F0] dark:bg-[#30291F]' : 'border-[#E5DACB] dark:border-[#332C27]'}`}>
                <span className="block text-sm font-semibold">{request.client_name}</span>
                <span className="block text-xs text-[#6A5D52] dark:text-[#B8ABA0]">{request.service_type.replace(/_/g, ' ')} · {request.cultural_occasion || 'Occasion not specified'}</span>
                <span className="block text-xs text-[#6A5D52] dark:text-[#B8ABA0]">Requested {new Date(request.slot_datetime).toLocaleString()}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-bold">Choose a protected slot</h5>
            <label className="block text-xs font-medium">Fitting resource
              <select value={resourceId} onChange={event => setResourceId(event.target.value)} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm">
                {resources.map(resource => <option key={resource.id} value={resource.id}>{resource.display_name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium">Date ({selectedResource?.timezone})
              <input type="date" value={day} min={new Date().toISOString().slice(0, 10)} onChange={event => { setDay(event.target.value); setSlotStart(''); }} className="mt-1 w-full rounded-xl border border-[#D9CFC2] px-3 py-2 text-sm" />
            </label>
            {selectedAppointment && <p className="text-xs text-[#6A5D52]">Service duration: {duration} minutes</p>}
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button key={slot.start} type="button" onClick={() => setSlotStart(slot.start)} className={`rounded-xl border px-2 py-2 text-sm font-semibold ${slotStart === slot.start ? 'border-[#8C6D2D] bg-[#161311] text-white' : 'border-[#E5DACB] dark:border-[#332C27]'}`}>
                  {timeInTimezone(slot.start, selectedResource?.timezone ?? 'UTC')}
                </button>
              ))}
            </div>
            {!loading && selectedAppointment && slots.length === 0 && <p className="text-xs text-[#6A5D52]">No available slots on this date. Choose another date or resource.</p>}
            <button type="button" disabled={busy || !selectedAppointment || !slotStart} onClick={confirmRequest} className="w-full rounded-xl bg-[#161311] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? 'Saving…' : 'Hold and confirm fitting'}
            </button>
          </div>
        </div>
      )}

      {pendingRequests.length === 0 && resources.length > 0 && <p className="text-sm text-[#6A5D52]">No pending fitting requests.</p>}

      {bookings.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-bold">Held and confirmed resource slots</h5>
          <div className="divide-y divide-[#E5DACB] rounded-2xl border border-[#E5DACB] dark:divide-[#332C27] dark:border-[#332C27]">
            {bookings.map(booking => (
              <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-semibold">{booking.guest_name || 'Atelier patron'} · {booking.service_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-[#6A5D52] dark:text-[#B8ABA0]">{resources.find(item => item.id === booking.resource_id)?.display_name || 'Resource'} · {booking.during}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8C6D2D]">{booking.status}</p>
                </div>
                {booking.status === 'confirmed' && <button type="button" disabled={busy} onClick={() => void cancelConfirmedBooking(booking)} className="rounded-lg border border-[#C8B69F] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Cancel and release slot</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
