import { AtelierTenant } from '../types';

// Demo-only seeded tenants. This file is never selected for a production
// bundle: vite.config.ts aliases the import to demoTenants.production.ts.
export const PREDEFINED_TENANTS: AtelierTenant[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'StitchFlow Atelier Nairobi',
    slug: 'tenant-a',
    tagline: 'Haute Couture Pan-African Tailoring & Royal Bespoke Regalia',
    city: 'Nairobi',
    country: 'Kenya',
    currency: 'KES',
    phone: '+254712345678',
    whatsapp: '+254712345678',
    default_unit: 'in'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Aso-Oke Heritage House Lagos',
    slug: 'tenant-b',
    tagline: 'Ancestral Weaves & Luxury Yoruba Ceremonial Agbada',
    city: 'Lagos',
    country: 'Nigeria',
    currency: 'NGN',
    phone: '+2348039876543',
    whatsapp: '+2348039876543',
    default_unit: 'in'
  }
];
