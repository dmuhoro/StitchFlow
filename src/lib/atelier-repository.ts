import { supabase, requireSupabase } from './supabase';
import { Appointment, Feedback, LookbookItem, Measurement, Order, ProductionStatus, AppointmentStatus } from '../types';

export interface AtelierMember {
  id: string;
  atelier_id: string;
  role: 'owner' | 'employee' | 'client';
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  title: string | null;
  specialty: string | null;
  active: boolean;
}

export interface AtelierSummary {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  whatsapp_number: string | null;
  default_currency: 'KES' | 'USD';
  default_unit: 'cm' | 'in';
}

export async function getCurrentMember(): Promise<AtelierMember | null> {
  if (!supabase) return null;
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await client
    .from('members')
    .select('id, atelier_id, role, full_name, phone, email, avatar_url, title, specialty, active')
    .eq('id', authData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  return data as AtelierMember | null;
}

export async function getAtelier(atelierId: string): Promise<AtelierSummary | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ateliers')
    .select('id, name, slug, tagline, whatsapp_number, default_currency, default_unit')
    .eq('id', atelierId)
    .maybeSingle();

  if (error) throw error;
  return data as AtelierSummary | null;
}

export async function listAtelierMembers(atelierId: string): Promise<AtelierMember[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('members')
    .select('id, atelier_id, role, full_name, phone, email, avatar_url, title, specialty, active')
    .eq('atelier_id', atelierId)
    .eq('active', true)
    .order('full_name');

  if (error) throw error;
  return (data ?? []) as AtelierMember[];
}

export async function createAtelierForCurrentUser(input: {
  name: string;
  slug: string;
  tagline?: string;
  whatsappNumber?: string;
}): Promise<string> {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error('Authentication required.');
  const { data: atelier, error: atelierError } = await client
    .from('ateliers')
    .insert({
      name: input.name.trim(),
      slug: input.slug,
      tagline: input.tagline ?? null,
      whatsapp_number: input.whatsappNumber ?? null,
      created_by: authData.user.id,
    })
    .select('id')
    .single();
  if (atelierError) throw atelierError;

  const { error: memberError } = await client.from('members').insert({
    id: authData.user.id,
    atelier_id: atelier.id,
    role: 'owner',
    full_name: authData.user.user_metadata?.full_name ?? authData.user.email?.split('@')[0] ?? 'Atelier Owner',
    email: authData.user.email ?? null,
  });
  if (memberError) throw memberError;
  return atelier.id;
}

export async function signOut(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export interface AtelierSnapshot {
  profiles: AtelierMember[];
  orders: Order[];
  measurements: Measurement[];
  appointments: Appointment[];
  feedbacks: Feedback[];
  lookbook: LookbookItem[];
}

export async function loadAtelierSnapshot(atelierId: string): Promise<AtelierSnapshot> {
  const client = requireSupabase();
  const [membersResult, ordersResult, notesResult, financialsResult, measurementsResult, appointmentsResult, feedbackResult, lookbookResult] = await Promise.all([
    client.from('members').select('id, atelier_id, role, full_name, phone, email, avatar_url, title, specialty, active').eq('atelier_id', atelierId).eq('active', true).order('full_name'),
    client.from('orders').select('id, atelier_id, order_code, client_id, assigned_tailor_id, status, description, garment_type, fabric_details, estimated_delivery, photo_url, created_at, updated_at').eq('atelier_id', atelierId).order('created_at', { ascending: false }),
    client.from('order_progress_notes').select('id, order_id, author_id, stage, note, created_at').order('created_at', { ascending: true }),
    client.from('order_financials').select('order_id, deposit_amount, balance_due, currency').eq('atelier_id', atelierId),
    client.from('measurements').select('id, client_id, unit, chest, waist, hips, length, sleeve, shoulder, inseam, neck, agbada_wingspan, fila_cap_head, posture_notes, updated_at').eq('atelier_id', atelierId),
    client.from('appointments').select('id, client_id, assigned_tailor_id, service_type, slot_datetime, status, notes, cultural_occasion, reference_url').eq('atelier_id', atelierId).order('slot_datetime'),
    client.from('feedback').select('id, order_id, client_id, rating, fit_rating, comments, resolution_status, created_at').eq('atelier_id', atelierId).order('created_at', { ascending: false }),
    client.from('lookbook_items').select('id, title, category, description, fabric, price_range, turnaround_days, image_url, tags, cultural_origin, is_featured').eq('atelier_id', atelierId).order('created_at', { ascending: false }),
  ]);

  const resultError = [membersResult, ordersResult, notesResult, financialsResult, measurementsResult, appointmentsResult, feedbackResult, lookbookResult].find(result => result.error)?.error;
  if (resultError) throw resultError;

  const members = (membersResult.data ?? []) as AtelierMember[];
  const memberById = new Map(members.map(member => [member.id, member]));
  const financialByOrder = new Map((financialsResult.data ?? []).map((row: any) => [row.order_id, row]));
  const notesByOrder = new Map<string, any[]>();
  for (const note of notesResult.data ?? []) {
    const notes = notesByOrder.get(note.order_id) ?? [];
    notes.push(note);
    notesByOrder.set(note.order_id, notes);
  }

  const orders = (ordersResult.data ?? []).map((row: any): Order => {
    const client = memberById.get(row.client_id);
    const tailor = row.assigned_tailor_id ? memberById.get(row.assigned_tailor_id) : undefined;
    const financial = financialByOrder.get(row.id);
    return {
      id: row.order_code,
      client_id: row.client_id,
      client_name: client?.full_name ?? 'Patron',
      client_phone: client?.phone ?? '',
      assigned_tailor_id: row.assigned_tailor_id ?? '',
      assigned_tailor_name: tailor?.full_name ?? 'Unassigned',
      status: row.status as ProductionStatus,
      description: row.description,
      garment_type: row.garment_type,
      fabric_details: row.fabric_details,
      estimated_delivery: row.estimated_delivery ?? '',
      deposit_amount: Number(financial?.deposit_amount ?? 0),
      balance_due: Number(financial?.balance_due ?? 0),
      currency: financial?.currency === 'USD' ? 'USD' : 'KES',
      photo_url: row.photo_url ?? '',
      progress_notes: (notesByOrder.get(row.id) ?? []).map(note => ({
        stage: note.stage as ProductionStatus,
        timestamp: note.created_at,
        note: note.note,
        author: memberById.get(note.author_id)?.full_name ?? 'Atelier team',
      })),
      created_at: row.created_at,
    };
  });
  const orderById = new Map((ordersResult.data ?? []).map((row: any) => [row.id, row]));

  return {
    profiles: members,
    orders,
    measurements: (measurementsResult.data ?? []).map((row: any) => ({ ...row, client_name: memberById.get(row.client_id)?.full_name ?? 'Patron', updated_at: row.updated_at })) as Measurement[],
    appointments: (appointmentsResult.data ?? []).map((row: any) => ({ ...row, client_name: memberById.get(row.client_id)?.full_name ?? 'Patron', client_phone: memberById.get(row.client_id)?.phone ?? '', assigned_tailor_name: memberById.get(row.assigned_tailor_id)?.full_name ?? 'Unassigned' })) as Appointment[],
    feedbacks: (feedbackResult.data ?? []).map((row: any) => ({ ...row, order_id: orders.find(order => orderById.get(row.order_id)?.order_code === order.id)?.id ?? row.order_id, client_name: memberById.get(row.client_id)?.full_name ?? 'Patron' })) as Feedback[],
    lookbook: (lookbookResult.data ?? []).map((row: any) => ({ ...row, image_url: row.image_url ?? '', tags: row.tags ?? [] })) as LookbookItem[],
  };
}

export async function persistOrderStatus(orderCode: string, status: ProductionStatus, note: string | undefined, authorId: string | null): Promise<void> {
  const client = requireSupabase();
  const { data: order, error: orderError } = await client.from('orders').select('id').eq('order_code', orderCode).maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('Order not found or not accessible.');
  const { error } = await client.from('orders').update({ status }).eq('id', order.id);
  if (error) throw error;
  const { error: noteError } = await client.from('order_progress_notes').insert({ order_id: order.id, author_id: authorId, stage: status, note: note ?? `Phase advanced to ${status.toUpperCase()}` });
  if (noteError) throw noteError;
}

export async function persistOrder(atelierId: string, order: Order): Promise<void> {
  const client = requireSupabase();
  const { data: inserted, error } = await client.from('orders').insert({ atelier_id: atelierId, order_code: order.id, client_id: order.client_id, assigned_tailor_id: order.assigned_tailor_id || null, status: order.status, description: order.description, garment_type: order.garment_type, fabric_details: order.fabric_details, estimated_delivery: order.estimated_delivery || null, photo_url: order.photo_url || null }).select('id').single();
  if (error) throw error;
  const { error: financialError } = await client.from('order_financials').insert({ order_id: inserted.id, atelier_id: atelierId, deposit_amount: order.deposit_amount, balance_due: order.balance_due, currency: order.currency });
  if (financialError) throw financialError;
  const { error: noteError } = await client.from('order_progress_notes').insert({ order_id: inserted.id, author_id: null, stage: order.status, note: order.progress_notes[0]?.note ?? 'New African commission drafted on cutting table.' });
  if (noteError) throw noteError;
}

export async function persistTailorAssignment(orderCode: string, tailorId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('orders').update({ assigned_tailor_id: tailorId }).eq('order_code', orderCode);
  if (error) throw error;
}

export async function persistMeasurement(atelierId: string, measurement: Measurement): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('measurements').upsert({ atelier_id: atelierId, client_id: measurement.client_id, unit: measurement.unit, chest: measurement.chest, waist: measurement.waist, hips: measurement.hips, length: measurement.length, sleeve: measurement.sleeve, shoulder: measurement.shoulder, inseam: measurement.inseam, neck: measurement.neck, agbada_wingspan: measurement.agbada_wingspan ?? null, fila_cap_head: measurement.fila_cap_head ?? null, posture_notes: measurement.posture_notes, verified_at: new Date().toISOString() }, { onConflict: 'atelier_id,client_id' });
  if (error) throw error;
}

export async function persistAppointment(atelierId: string, appointment: Appointment): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('appointments').insert({ id: appointment.id, atelier_id: atelierId, client_id: appointment.client_id, assigned_tailor_id: appointment.assigned_tailor_id || null, service_type: appointment.service_type, slot_datetime: appointment.slot_datetime, status: appointment.status, notes: appointment.notes ?? null, cultural_occasion: appointment.cultural_occasion ?? null, reference_url: appointment.reference_url ?? null });
  if (error) throw error;
}

export async function persistAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('appointments').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function persistFeedback(atelierId: string, feedback: Omit<Feedback, 'id' | 'created_at' | 'resolution_status'>): Promise<void> {
  const client = requireSupabase();
  const { data: order, error: orderError } = await client.from('orders').select('id').eq('order_code', feedback.order_id).maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('Order not found or not accessible.');
  const { error } = await client.from('feedback').insert({ atelier_id: atelierId, order_id: order.id, client_id: feedback.client_id, rating: feedback.rating, fit_rating: feedback.fit_rating, comments: feedback.comments });
  if (error) throw error;
}
