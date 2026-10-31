/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'employee' | 'client' | 'visitor';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ProductionStatus = 'cutting' | 'stitching' | 'fitting' | 'ready';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type AppointmentType = 
  | 'ruracio_bridal'
  | 'grand_agbada'
  | 'senator_kaftan'
  | 'kitenge_wax_styling'
  | 'basted_fitting'
  | 'final_collection';

export interface AtelierTenant {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  city: string;
  country: string;
  currency: 'KES' | 'NGN' | 'USD';
  phone: string;
  whatsapp: string;
  default_unit: 'in' | 'cm';
}

export interface Profile {
  id: string;
  atelier_id?: string;
  role: 'owner' | 'employee' | 'client';
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string;
  title?: string;
  specialty?: string;
  passkey?: string; // e.g. "DIRECTOR-01", "AMANI-88"
}

export interface AtelierSettings {
  atelier_id?: string;
  atelier_name: string;
  studio_tagline: string;
  whatsapp_number: string;
  currency: 'KES' | 'NGN' | 'USD';
  default_unit: 'in' | 'cm';
  theme_mode: ThemeMode;
  notifications_enabled: boolean;
  auto_backup: boolean;
}

export interface Appointment {
  id: string;
  atelier_id?: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  assigned_tailor_id: string;
  service_type: AppointmentType;
  slot_datetime: string;
  status: AppointmentStatus;
  notes?: string;
  cultural_occasion?: string;
  reference_url?: string;
}

export interface Order {
  id: string; // e.g. ORD-892
  atelier_id?: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  assigned_tailor_id: string;
  assigned_tailor_name: string;
  status: ProductionStatus;
  description: string;
  garment_type: string;
  fabric_details: string;
  estimated_delivery: string;
  deposit_amount: number;
  balance_due: number;
  currency: 'KES' | 'NGN' | 'USD';
  photo_url: string;
  progress_notes: {
    stage: ProductionStatus;
    timestamp: string;
    note: string;
    author: string;
  }[];
  created_at: string;
}

export interface Measurement {
  id: string;
  atelier_id?: string;
  client_id: string;
  client_name: string;
  unit: 'in' | 'cm';
  chest: number;
  waist: number;
  hips: number;
  length: number;
  sleeve: number;
  shoulder: number;
  inseam: number;
  neck: number;
  agbada_wingspan?: number;
  fila_cap_head?: number;
  posture_notes: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  atelier_id?: string;
  order_id: string;
  client_id: string;
  client_name: string;
  rating: number; // 1-5
  fit_rating: 'tight' | 'perfect' | 'loose';
  comments: string;
  resolution_status: 'open' | 'addressed' | 'resolved';
  created_at: string;
}

export interface LookbookItem {
  id: string;
  atelier_id?: string;
  title: string;
  category: 
    | 'Grand Agbada & Boubou'
    | 'Senator Suits & Kaftans'
    | 'Ceremonial & Bridal'
    | 'Modern Kitenge & Wax'
    | 'Heritage Tunics & Kanzu';
  description: string;
  fabric: string;
  price_range: string;
  turnaround_days: number;
  image_url: string;
  tags: string[];
  cultural_origin: string;
  is_featured: boolean;
}

export interface ReferralData {
  client_id: string;
  code: string;
  referral_link: string;
  successful_conversions: number;
  rewards_earned_kes: number;
}
