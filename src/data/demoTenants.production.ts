import { AtelierTenant } from '../types';

// Production has no seeded tenants. The real atelier is resolved from the URL
// slug or the authenticated member row, and never from a client-side default.
export const PREDEFINED_TENANTS: AtelierTenant[] = [];
