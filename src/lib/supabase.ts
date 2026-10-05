import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const getSupabaseAppUrl = (): string => {
  const configuredUrl =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_REDIRECT_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

  return (configuredUrl || 'http://localhost:5173').replace(/\/+$/, '');
};

export const getSupabaseOAuthRedirectUrl = (): string => {
  return getSupabaseAppUrl();
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

if (!isSupabaseConfigured) {
  console.warn(
    '[CivicFix] Supabase URL or Anon Key is missing or still set to the placeholder values. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. Optional deployed redirect URL: VITE_SITE_URL or VITE_APP_URL.'
  );
}

// Create and export the typed Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
