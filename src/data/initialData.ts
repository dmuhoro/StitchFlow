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
    title: 'Imperial Aso-Oke 3-Piece Grand Agbada',
    category: 'Grand Agbada & Boubou',
    description: '3-Piece royal ceremonial regalia tailored from handwoven magenta and gold Aso-Oke strip fabric, featuring heavy gold cord chest embroidery, matching Sokoto drawstring trousers, and hand-pleated Yoruba Fila cap.',
    fabric: 'Handwoven Alaari Aso-Oke with Metallic Gold Thread',
    price_range: '85,000 - 140,000 KES',
    turnaround_days: 14,
    image_url: '/src/assets/images/agbada_aso_oke_1793438762681.jpg',
    tags: ['Grand Agbada', 'Nigerian Aso-Oke', 'Royal Alaari', 'Yoruba Fila', 'Bespoke'],
    cultural_origin: 'Yoruba & West African High Royal Regalia',
    is_featured: true
  },
  {
    id: 'LKB-02',
    title: 'Executive Midnight Senator Kaftan Suit',
    category: 'Senator Suits & Kaftans',
    description: 'Two-piece tailored tunic and tapered trousers in deep navy and cream featuring minimalist geometric Hausa neckline embroidery, concealed placket, and French cuff accents.',
    fabric: 'Super 150s Tropical Wool & Hand-Finished Silk Thread',
    price_range: '48,000 - 68,000 KES',
    turnaround_days: 10,
    image_url: '/src/assets/images/senator_suit_kaftan_1793438763426.jpg',
    tags: ['Senator Kaftan', 'Executive', 'Hausa Embroidery', 'Mandarin Collar', 'Pan-African'],
    cultural_origin: 'West African & Niger Delta Executive Couture',
    is_featured: true
  },
  {
    id: 'LKB-03',
    title: 'Kenyan Ruracio Kitenge Bridal Corset Gown',
    category: 'Ceremonial & Bridal',
    description: 'Sculpted corseted gown tailored from authentic emerald green and gold Vlisco Hollandais wax print with peplum tier, layered train, handcrafted cowrie shell neckpiece, and artistic matching Gele headwrap.',
    fabric: 'Original Vlisco Hollandais Wax, Organza & Natural Cowrie Shells',
    price_range: '70,000 - 115,000 KES',
    turnaround_days: 18,
    image_url: '/src/assets/images/kitenge_ruracio_bridal_1793438764201.jpg',
    tags: ['Ruracio Bridal', 'Vlisco Hollandais', 'Kikuyu Wedding', 'Cowrie Beads', 'Kenyan Bridal'],
    cultural_origin: 'Kenyan Central & Western Traditional Dowry (Ruracio)',
    is_featured: true
  },
  {
    id: 'LKB-04',
    title: 'Ashanti Bonwire Kente Velvet Gala Cape',
    category: 'Modern Kitenge & Wax',
    description: 'Bespoke evening gala ensemble combining authentic hand-loomed Ghanaian Bonwire Kente strips with structured black silk velvet cape, royal gold necklace accents, and high-slit evening dress.',
    fabric: 'Authentic Hand-Loomed Bonwire Kente Silk & Pure Black Velvet',
    price_range: '75,000 - 120,000 KES',
    turnaround_days: 14,
    image_url: '/src/assets/images/bonwire_kente_regalia_1793438764736.jpg',
    tags: ['Bonwire Kente', 'Ghanaian Couture', 'Ashanti Royalty', 'Gala Cape', 'Gold Weave'],
    cultural_origin: 'Ghanaian Ashanti Royalty & Ceremonial Gala',
    is_featured: true
  },
  {
    id: 'LKB-05',
    title: 'Swahili Coastal Damask Kanzu & Royal Bisht',
    category: 'Heritage Tunics & Kanzu',
    description: 'Floor-length pure white Egyptian cotton damask Kanzu featuring handcrafted Lamu gold placket embroidery, draped with a ceremonial sheer black and gold bullion Bisht robe and embroidered Kofia cap.',
    fabric: 'Egyptian Cotton Damask & Moroccan Metallic Bullion Cord',
    price_range: '45,000 - 65,000 KES',
    turnaround_days: 8,
    image_url: '/src/assets/images/swahili_lamu_kanzu_1793438765918.jpg',
    tags: ['Swahili Kanzu', 'Lamu Archipelago', 'Ceremonial Bisht', 'Gold Placket', 'Coastal Heritage'],
    cultural_origin: 'Swahili Coast & Lamu Heritage (Kenyan Coast)',
    is_featured: true
  },
  {
    id: 'LKB-06',
    title: 'Kikuyu Traditional Ceremonial Dowry Attire',
    category: 'Ceremonial & Bridal',
    description: 'Authentic Kenyan Agikuyu ceremonial dress with earth-toned calfskin and linen drape, circular multi-layered Kikuyu beaded collar necklaces, cowrie shell embellishments, and brass wedding ornaments.',
    fabric: 'Tanned Earth Linen, Calfskin & Hand-Strung Glass Beadwork',
    price_range: '55,000 - 85,000 KES',
    turnaround_days: 12,
    image_url: '/src/assets/images/kenyan_tribal_kikuyu_1793438766135.jpg',
    tags: ['Kikuyu Heritage', 'Agikuyu Traditional', 'Ruracio Ceremony', 'Beaded Collars', 'Kenyan Tribe'],
    cultural_origin: 'Kikuyu / Agikuyu Tribal Heritage (Central Kenya)',
    is_featured: true
  },
  {
    id: 'LKB-07',
    title: 'Maasai Ceremonial Shúkà & Enkarewa Regalia',
    category: 'Heritage Tunics & Kanzu',
    description: 'Monumental ceremonial attire featuring authentic red and blue checkered Maasai Shúkà, multi-layered circular Enkarewa beaded wedding collar, beaded royal headdress, and ceremonial leadership staff.',
    fabric: 'Authentic Hand-Treated Kenyan Acrylic Shúkà & Maasai Beadwork',
    price_range: '48,000 - 72,000 KES',
    turnaround_days: 10,
    image_url: '/src/assets/images/kenyan_tribal_maasai_1793438766637.jpg',
    tags: ['Maasai Shúkà', 'Enkarewa Beadwork', 'Maasai Tribe', 'Kenyan Warrior Regalia', 'Ceremonial'],
    cultural_origin: 'Maasai Tribal Regalia (Great Rift Valley, Kenya)',
    is_featured: true
  },
  {
    id: 'LKB-08',
    title: 'East African Hand-Loomed Kikoy Safari Duster',
    category: 'Modern Kitenge & Wax',
    description: 'Tailored contemporary duster coat crafted from authentic striped Kenyan Kikoy fabric with turquoise, orange, and gold geometric borders, paired with custom linen tailored trousers.',
    fabric: 'Pure Kenyan Hand-Loomed Kikoy Cotton & Belgian Linen',
    price_range: '36,000 - 52,000 KES',
    turnaround_days: 7,
    image_url: '/src/assets/images/kenyan_kikoy_modern_1793438766233.jpg',
    tags: ['Kenyan Kikoy', 'Safari Duster', 'Modern African', 'Lamu Stripe', 'Contemporary'],
    cultural_origin: 'Kenyan Coastal Kikoy & East African Heritage',
    is_featured: false
  }
];
