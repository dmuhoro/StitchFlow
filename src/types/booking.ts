export type BookingStatus = 'held' | 'confirmed' | 'cancelled' | 'expired';

export interface Booking {
  id: string;
  atelier_id?: string;
  resource_id?: string;
  appointment_id?: string | null;
  client_id?: string | null;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  hold_expires_at?: string;
  status: BookingStatus;
  hold_minutes?: number;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  error?: string;
  slots?: AvailabilitySlot[];
  timezone?: string;
  slot_minutes?: number;
}
