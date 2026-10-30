/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'employee' | 'client' | 'visitor';

export type ProductionStatus = 'cutting' | 'stitching' | 'fitting' | 'ready';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type AppointmentType = 
  | 'ruracio_bridal'
  | 'grand_agbada'
  | 'senator_kaftan'
  | 'kitenge_wax_styling'
  | 'basted_fitting'
  | 'final_collection';

export interface Profile {
  id: string;
  role: 'owner' | 'employee' | 'client';
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string;
  title?: string;
  specialty?: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  assigned_tailor_id: string;
  service_type: AppointmentType;
  slot_datetime: string;
  status: AppointmentStatus;
  notes?: string;
  cultural_occasion?: string; // e.g. "Ruracio Ceremony", "Traditional Wedding", "Chieftaincy Gala"
  reference_url?: string;
}

export interface Order {
  id: string; // e.g. ORD-892
  client_id: string;
  client_name: string;
  client_phone: string;
  assigned_tailor_id: string;
  assigned_tailor_name: string;
  status: ProductionStatus;
  description: string;
  garment_type: string; // e.g. "3-Piece Embroidered Grand Agbada", "Bespoke Senator Kaftan Set", "Kitenge Corseted Ruracio Gown"
  fabric_details: string; // e.g. "Vlisco Hollandais Wax + Silk Satin Trim", "Raw Aso-Oke Hand-Woven Textile", "Bazin Riche + Gold Metallic Embroidery"
  estimated_delivery: string;
  deposit_amount: number;
  balance_due: number;
  currency: 'KES' | 'USD';
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
  client_id: string;
  client_name: string;
  unit: 'in' | 'cm';
  chest: number; // Kaftan / Buba chest
  waist: number;
  hips: number;
  length: number; // Robe / Tunic length
  sleeve: number; // Sleeve length
  shoulder: number; // Shoulder width
  inseam: number; // Sokoto / Trouser inseam
  neck: number; // Embroidered collar circumference
  agbada_wingspan?: number; // Agbada wrist-to-wrist span
  fila_cap_head?: number; // Matching traditional cap circumference
  posture_notes: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
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
  cultural_origin: string; // e.g. "Yoruba & Hausa Royal Couture", "East African Kikoy & Swahili", "Kenyan Ruracio Bridal", "Ghanaian Kente"
  is_featured: boolean;
}

export interface ReferralData {
  client_id: string;
  code: string;
  referral_link: string;
  successful_conversions: number;
  rewards_earned_kes: number;
}
