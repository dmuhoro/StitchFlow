import { requireSupabase } from './supabase';
import { AvailabilityResponse, Booking } from '../types/booking';

export interface HoldSlotParams {
  atelierId: string;
  resourceId: string;
  during: [string, string]; // timestamp range [start,end)
  serviceType: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  culturalOccasion?: string;
  notes?: string;
  idempotencyKey?: string;
  holdMinutes?: number;
  appointmentId?: string;
}

export interface HoldSlotResult {
  booking_id?: string;
  status?: string;
  during?: string;
  hold_token?: string;
  hold_expires_at?: string;
  replayed?: boolean;
  error?: string;
}

export interface BookingResource {
  id: string;
  atelier_id: string;
  kind: 'cutter' | 'fitter' | 'fitting_room' | 'workshop';
  display_name: string;
  timezone: string;
}

export interface AtelierBooking {
  id: string;
  atelier_id: string;
  resource_id: string;
  appointment_id: string | null;
  status: Booking['status'];
  during: string;
  service_type: string;
  guest_name: string | null;
  guest_phone: string | null;
}

export async function listBookingResources(atelierId: string): Promise<BookingResource[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('booking_resources')
    .select('id, atelier_id, kind, display_name, timezone')
    .eq('atelier_id', atelierId)
    .eq('active', true)
    .order('display_name');
  if (error) throw error;
  return (data ?? []) as BookingResource[];
}

export async function createBookingResource(input: {
  atelierId: string;
  kind: BookingResource['kind'];
  displayName: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
}): Promise<BookingResource> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_booking_resource', {
    p_atelier_id: input.atelierId,
    p_kind: input.kind,
    p_display_name: input.displayName,
    p_timezone: input.timezone,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_weekdays: [1, 2, 3, 4, 5, 6],
  });
  if (error) throw error;
  const result = data as BookingResource & { error?: string };
  if (result.error) throw new Error(result.error);
  return result;
}

export async function listAtelierBookings(atelierId: string): Promise<AtelierBooking[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('bookings')
    .select('id, atelier_id, resource_id, appointment_id, status, during, service_type, guest_name, guest_phone')
    .eq('atelier_id', atelierId)
    .in('status', ['held', 'confirmed'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AtelierBooking[];
}

export async function getAvailability(atelierId: string, resourceId: string, from: Date, to: Date, slotMinutes?: number): Promise<AvailabilityResponse> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_availability', {
    p_atelier_id: atelierId,
    p_resource_id: resourceId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_slot_minutes: slotMinutes ?? 60,
  });
  if (error) throw error;
  // data is jsonb, we cast to any
  return data as AvailabilityResponse;
}

export async function holdSlot(params: HoldSlotParams): Promise<HoldSlotResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('hold_slot', {
    p_atelier_id: params.atelierId,
    p_resource_id: params.resourceId,
    p_during: `[${params.during[0]},${params.during[1]})`,
    p_service_type: params.serviceType,
    p_client_id: params.clientId ?? null,
    p_client_name: params.clientName ?? null,
    p_client_phone: params.clientPhone ?? null,
    p_client_email: params.clientEmail ?? null,
    p_cultural_occasion: params.culturalOccasion ?? null,
    p_notes: params.notes ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_hold_minutes: params.holdMinutes ?? 10,
    p_appointment_id: params.appointmentId ?? null,
  });
  if (error) throw error;
  return data as HoldSlotResult;
}

export async function confirmBooking(holdToken: string): Promise<{ booking_id?: string; status?: string; error?: string }> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('confirm_booking', { p_hold_token: holdToken });
  if (error) throw error;
  return data as any;
}

export async function cancelBooking(bookingId: string): Promise<{ booking_id?: string; status?: string; error?: string }> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('cancel_booking', { p_booking_id: bookingId });
  if (error) throw error;
  return data as { booking_id?: string; status?: string; error?: string };
}

export async function expireStaleHolds(): Promise<number> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('expire_stale_holds');
  if (error) throw error;
  return Number(data ?? 0);
}
