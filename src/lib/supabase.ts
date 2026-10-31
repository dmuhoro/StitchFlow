import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey && !url.includes('your-project-ref'));
export const dataMode = (import.meta.env.VITE_DATA_MODE as 'demo' | 'supabase' | undefined) ?? 'demo';

if (dataMode === 'supabase' && !isSupabaseConfigured) {
  throw new Error('VITE_DATA_MODE=supabase requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the VITE_SUPABASE_* environment variables.');
  }
  return supabase;
}
