/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Profile, Order, Measurement, Appointment, Feedback, LookbookItem } from '../types';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr_owner_01',
    role: 'owner',
    full_name: 'Wanjiku Kamau',
    phone: '+254 712 345 678',
    email: 'wanjiku@stitchflowatelier.com',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    title: 'Creative Director & Founder',
    specialty: 'Pan-African Haute Couture & Cultural Ceremonial Attire'
  },
  {
    id: 'usr_tailor_01',
    role: 'employee',
    full_name: 'Amani Mutiso',
    phone: '+254 722 987 654',
    email: 'amani@stitchflowatelier.com',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    title: 'Master Agbada & Pattern Architect',
    specialty: 'Grand Agbada Wingspans, Boubous & Structured Wax Print'
  },
  {
    id: 'usr_tailor_02',
    role: 'employee',
    full_name: 'Kofi Mensah',
    phone: '+254 733 456 789',
    email: 'kofi@stitchflowatelier.com',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    title: 'Senior Artisan & Senator Specialist',
    specialty: 'Senator Kaftan Sets, Swahili Kanzus & Chest Embroidery'
  },
  {
    id: 'usr_tailor_03',
    role: 'employee',
    full_name: 'Zari Odhiambo',
    phone: '+254 799 112 233',
    email: 'zari@stitchflowatelier.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    title: 'Ruracio & Bridal Beadwork Artisan',
    specialty: 'Traditional Wedding Attire, Cowrie Embellishment & Gele'
  },
  {
    id: 'usr_client_01',
    role: 'client',
    full_name: 'Nyambura Mwangi',
    phone: '+254 720 889 900',
    email: 'nyambura.m@luxekenya.co',
    avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
    title: 'Bespoke Patron',
    specialty: 'Kenyan Ruracio & Traditional Gala Wardrobe'
  },
  {
    id: 'usr_client_02',
    role: 'client',
    full_name: 'David Ochieng',
    phone: '+254 711 554 433',
    email: 'david.ochieng@nairobihub.io',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    title: 'Bespoke Patron',
    specialty: '3-Piece Grand Agbadas & Executive Senator Sets'
  },
  {
    id: 'usr_client_03',
    role: 'client',
    full_name: 'Fatima El-Amin',
    phone: '+254 788 332 211',
    email: 'fatima@elaminconsult.com',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    title: 'Bespoke Patron',
    specialty: 'Swahili Coastal Kaftans & Hand-Embroidered Robes'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-892',
    client_id: 'usr_client_01',
    client_name: 'Nyambura Mwangi',
    client_phone: '+254 720 889 900',
    assigned_tailor_id: 'usr_tailor_03',
    assigned_tailor_name: 'Zari Odhiambo',
    status: 'fitting',
    description: 'Kenyan Ruracio Bridal Ensemble: Sculpted Kitenge peplum corset gown with hand-stitched cowrie shells and matching Gele headwrap.',
    garment_type: 'Ruracio Traditional Bridal Attire',
    fabric_details: 'Authentic Vlisco Hollandais Wax in Ochre & Emerald with metallic brass wire beading',
    estimated_delivery: '2026-11-08',
    deposit_amount: 55000,
    balance_due: 35000,
    currency: 'KES',
    photo_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&auto=format&fit=crop&q=80',
    progress_notes: [
      {
        stage: 'cutting',
        timestamp: '2026-10-24 10:30',
        note: 'Wax print motif centered symmetrically across front bust and peplum flare.',
        author: 'Amani Mutiso'
      },
      {
        stage: 'stitching',
        timestamp: '2026-10-27 15:45',
        note: 'Internal corsetry boning inserted, neckline border hand-beaded with cowrie shells.',
        author: 'Zari Odhiambo'
      },
      {
        stage: 'fitting',
        timestamp: '2026-10-29 11:15',
        note: 'Basted fitting completed. Waist cinch calibrated for traditional wedding dance.',
        author: 'Zari Odhiambo'
      }
    ],
    created_at: '2026-10-22'
  },
  {
    id: 'ORD-893',
    client_id: 'usr_client_02',
    client_name: 'David Ochieng',
    client_phone: '+254 711 554 433',
    assigned_tailor_id: 'usr_tailor_01',
    assigned_tailor_name: 'Amani Mutiso',
    status: 'stitching',
    description: 'Royal 3-Piece Grand Agbada with intricate Hausa/Yoruba chain-stitched chest embroidery, Buba tunic, tapered Sokoto trousers, and matching hand-sewn Fila cap.',
    garment_type: '3-Piece Grand Royal Agbada Set',
    fabric_details: 'Original German Guinea Brocade in Royal Midnight Indigo with metallic gold filigree embroidery',
    estimated_delivery: '2026-11-12',
    deposit_amount: 70000,
    balance_due: 45000,
    currency: 'KES',
    photo_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    progress_notes: [
      {
        stage: 'cutting',
        timestamp: '2026-10-26 09:00',
        note: 'Wingspan cut to 66.5 inches for regal shoulder fold. Sokoto tapered for leather slides.',
        author: 'Amani Mutiso'
      },
      {
        stage: 'stitching',
        timestamp: '2026-10-28 14:00',
        note: 'Chain-stitching chest crest in progress. Collar reinforced for crisp ceremonial standing.',
        author: 'Kofi Mensah'
      }
    ],
    created_at: '2026-10-25'
  },
  {
    id: 'ORD-894',
    client_id: 'usr_client_03',
    client_name: 'Fatima El-Amin',
    client_phone: '+254 788 332 211',
    assigned_tailor_id: 'usr_tailor_02',
    assigned_tailor_name: 'Kofi Mensah',
    status: 'cutting',
    description: 'Swahili Coastal Silk Kaftan with gold zari thread placket embroidery and wide kimono sleeves.',
    garment_type: 'Swahili Silk Kaftan Robe',
    fabric_details: 'Hand-dyed Moroccan Silk Crepe with traditional Lamu floral placket stitching',
    estimated_delivery: '2026-11-18',
    deposit_amount: 32000,
    balance_due: 24000,
    currency: 'KES',
    photo_url: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
    progress_notes: [
      {
        stage: 'cutting',
        timestamp: '2026-10-29 16:30',
        note: 'Fabric steamed and shrunk. Bias cut applied for fluid Swahili coastal movement.',
        author: 'Amani Mutiso'
      }
    ],
    created_at: '2026-10-28'
  },
  {
    id: 'ORD-891',
    client_id: 'usr_client_02',
    client_name: 'David Ochieng',
    client_phone: '+254 711 554 433',
    assigned_tailor_id: 'usr_tailor_02',
    assigned_tailor_name: 'Kofi Mensah',
    status: 'ready',
    description: 'Executive Modern Senator Suit in rich sand beige with asymmetric breast embroidery and mandarin collar.',
    garment_type: 'Executive Senator Kaftan Suit',
    fabric_details: 'Heavy 350gsm African Linen-Cotton Blend with chocolate brown geometric embroidery',
    estimated_delivery: '2026-10-29',
    deposit_amount: 38000,
    balance_due: 0,
    currency: 'KES',
    photo_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80',
    progress_notes: [
      {
        stage: 'cutting',
        timestamp: '2026-10-14 11:00',
        note: 'Mandarin collar chalked and precision cut.',
        author: 'Amani Mutiso'
      },
      {
        stage: 'stitching',
        timestamp: '2026-10-18 16:20',
        note: 'Asymmetric chest crest machine and hand chain-stitched.',
        author: 'Kofi Mensah'
      },
      {
        stage: 'fitting',
        timestamp: '2026-10-23 14:00',
        note: 'Client approved collar comfort and trouser hem break.',
        author: 'Kofi Mensah'
      },
      {
        stage: 'ready',
        timestamp: '2026-10-29 10:00',
        note: 'Hand-pressed, cedar scented, packaged with custom embroidered garment dust cover.',
        author: 'Wanjiku Kamau'
      }
    ],
    created_at: '2026-10-12'
  }
];

export const INITIAL_MEASUREMENTS: Measurement[] = [
  {
    id: 'meas_01',
    client_id: 'usr_client_01',
    client_name: 'Nyambura Mwangi',
    unit: 'in',
    chest: 36.5,
    waist: 28.0,
    hips: 41.5,
    length: 58.0,
    sleeve: 23.5,
    shoulder: 15.5,
    inseam: 31.0,
    neck: 13.5,
    fila_cap_head: 22.0,
    posture_notes: 'Erect posture. Corset fitted for traditional Ruracio ceremony. Ensure peplum aligns with hip flare.',
    updated_at: '2026-10-20'
  },
  {
    id: 'meas_02',
    client_id: 'usr_client_02',
    client_name: 'David Ochieng',
    unit: 'in',
    chest: 44.0,
    waist: 35.0,
    hips: 43.0,
    length: 54.0,
    sleeve: 26.0,
    shoulder: 19.5,
    inseam: 33.5,
    neck: 17.0,
    agbada_wingspan: 66.5,
    fila_cap_head: 23.5,
    posture_notes: 'Broad shoulders. Agbada wingspan 66.5 inches for generous ceremonial drape. Sokoto tapered at hem.',
    updated_at: '2026-10-22'
  },
  {
    id: 'meas_03',
    client_id: 'usr_client_03',
    client_name: 'Fatima El-Amin',
    unit: 'cm',
    chest: 94.0,
    waist: 74.0,
    hips: 106.0,
    length: 145.0,
    sleeve: 62.0,
    shoulder: 41.0,
    inseam: 81.0,
    neck: 37.0,
    fila_cap_head: 56.0,
    posture_notes: 'Swahili kaftan floor-length drape. Generous ease across chest and sleeves for airy coastal comfort.',
    updated_at: '2026-10-25'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt_101',
    client_id: 'usr_client_01',
    client_name: 'Nyambura Mwangi',
    client_phone: '+254 720 889 900',
    assigned_tailor_id: 'usr_tailor_03',
    service_type: 'ruracio_bridal',
    slot_datetime: '2026-11-04T14:00:00',
    status: 'confirmed',
    cultural_occasion: 'Kenyan Ruracio Traditional Wedding',
    notes: 'Final fitting for Kitenge corset gown with cowrie beadwork and matching Gele headwrap.'
  },
  {
    id: 'apt_102',
    client_id: 'usr_client_02',
    client_name: 'David Ochieng',
    client_phone: '+254 711 554 433',
    assigned_tailor_id: 'usr_tailor_01',
    service_type: 'grand_agbada',
    slot_datetime: '2026-11-05T10:30:00',
    status: 'confirmed',
    cultural_occasion: 'Pan-African Leadership Gala',
    notes: 'Try on basted Guinea Brocade Agbada for shoulder wing balance and Fila cap sizing.'
  },
  {
    id: 'apt_103',
    client_id: 'usr_client_03',
    client_name: 'Fatima El-Amin',
    client_phone: '+254 788 332 211',
    assigned_tailor_id: 'usr_tailor_02',
    service_type: 'kitenge_wax_styling',
    slot_datetime: '2026-11-06T15:00:00',
    status: 'pending',
    cultural_occasion: 'Cultural Festival Banquet',
    notes: 'Reviewing authentic Adire and Kente swatches for custom ceremonial kaftan.'
  }
];

export const INITIAL_FEEDBACK: Feedback[] = [
  {
    id: 'fbk_201',
    order_id: 'ORD-891',
    client_id: 'usr_client_02',
    client_name: 'David Ochieng',
    rating: 5,
    fit_rating: 'perfect',
    comments: 'The sand-beige Senator suit with asymmetric chest embroidery was the highlight of our regional summit! The mandarin collar fits comfortably without stiff pinching. Kofi Mensah is a true artisan.',
    resolution_status: 'resolved',
    created_at: '2026-10-30'
  }
];

export const INITIAL_LOOKBOOK: LookbookItem[] = [
  {
    id: 'LKB-01',
    title: 'The Sovereign Royal Grand Agbada',
    category: 'Grand Agbada & Boubou',
    description: '3-Piece royal attire comprising an expansive embroidered Agbada robe, structured Buba tunic, tailored Sokoto, and matching hand-sewn Fila cap.',
    fabric: 'Original German Guinea Brocade with Gold Zari Thread',
    price_range: '75,000 - 110,000 KES',
    turnaround_days: 14,
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
    tags: ['Agbada', 'Yoruba Couture', 'Gold Embroidery', 'Fila Cap', 'Royal Attire'],
    cultural_origin: 'Yoruba & Hausa Royal Heritage',
    is_featured: true
  },
  {
    id: 'LKB-02',
    title: 'Kenyan Ruracio Kitenge Bridal Gown',
    category: 'Ceremonial & Bridal',
    description: 'Sculpted corseted gown tailored from authentic Vlisco wax print with hand-applied cowrie shells, peplum flare, and matching Gele headwrap.',
    fabric: 'Vlisco Hollandais Wax, Organza & Natural Cowrie Shells',
    price_range: '65,000 - 95,000 KES',
    turnaround_days: 18,
    image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80',
    tags: ['Ruracio', 'Kitenge', 'Traditional Bridal', 'Cowrie Beads', 'Kenyan Fashion'],
    cultural_origin: 'Kenyan Central & Western Traditional Wedding',
    is_featured: true
  },
  {
    id: 'LKB-03',
    title: 'Executive Midnight Senator Kaftan Suit',
    category: 'Senator Suits & Kaftans',
    description: 'Two-piece tailored tunic and tapered trousers featuring geometric Hausa chest embroidery, concealed button placket, and mandarin collar.',
    fabric: 'Belgian Linen-Cotton Blend & Hand-Finished Silk Thread',
    price_range: '45,000 - 65,000 KES',
    turnaround_days: 10,
    image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80',
    tags: ['Senator Suit', 'Kaftan', 'Mandarin Collar', 'Pan-African', 'Executive'],
    cultural_origin: 'West African Modern Executive',
    is_featured: true
  },
  {
    id: 'LKB-04',
    title: 'Swahili Coastal Silk Kanzu & Robe',
    category: 'Heritage Tunics & Kanzu',
    description: 'Floor-length pure white Egyptian cotton Kanzu with handcrafted Lamu placket embroidery, paired with a ceremonial Bisht over-robe.',
    fabric: 'Egyptian Cotton & Moroccan Silk Zari Cord',
    price_range: '40,000 - 55,000 KES',
    turnaround_days: 8,
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    tags: ['Kanzu', 'Swahili', 'Coastal Heritage', 'Hand-Stitched', 'Ceremonial'],
    cultural_origin: 'Swahili Coast & Lamu Archipelago',
    is_featured: false
  },
  {
    id: 'LKB-05',
    title: 'Ashanti Kente Ceremonial Gala Cape',
    category: 'Modern Kitenge & Wax',
    description: 'Bespoke evening ensemble incorporating authentic hand-loomed Ghanaian Kente strips across structured black velvet lapels.',
    fabric: 'Hand-Woven Bonwire Kente Silk-Cotton & Black Velvet',
    price_range: '60,000 - 85,000 KES',
    turnaround_days: 14,
    image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
    tags: ['Kente', 'Ashanti', 'Hand-Woven', 'Gala Attire', 'Ghanaian Couture'],
    cultural_origin: 'Ghanaian Ashanti Royal Heritage',
    is_featured: true
  },
  {
    id: 'LKB-06',
    title: 'East African Kikoy & Twill Safari Duster',
    category: 'Heritage Tunics & Kanzu',
    description: 'Contemporary duster coat featuring authentic hand-loomed Kenyan Kikoy borders and Maasai shuka geometric trim.',
    fabric: 'Heavy Sand Twill with Hand-Loomed Kenyan Kikoy Trim',
    price_range: '38,000 - 50,000 KES',
    turnaround_days: 7,
    image_url: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80',
    tags: ['Kikoy', 'Kenyan Textile', 'Safari Duster', 'Modern Heritage'],
    cultural_origin: 'East African Savannah & Coastal',
    is_featured: false
  }
];
