import { supabase, requireSupabase } from './supabase';

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

export async function createAtelierForCurrentUser(input: {
  name: string;
  slug: string;
  tagline?: string;
  whatsappNumber?: string;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_atelier_for_current_user', {
    atelier_name: input.name,
    atelier_slug: input.slug,
    atelier_tagline: input.tagline ?? null,
    atelier_whatsapp: input.whatsappNumber ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function signOut(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
