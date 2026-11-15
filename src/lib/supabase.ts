import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const validProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && isLocalhost);
    return validProtocol && Boolean(url.host) && !/your-project-id|placeholder|example/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isValidPublicKey(value: string): boolean {
  const isLegacyAnonKey = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  const isPublishableKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(value);
  return isLegacyAnonKey || isPublishableKey;
}

export function getSupabaseConfigurationError(): string | null {
  if (!supabaseUrl) return 'VITE_SUPABASE_URL is missing from the project .env file.';
  if (!isValidSupabaseUrl(supabaseUrl)) {
    return 'VITE_SUPABASE_URL must be a valid HTTPS Supabase project URL (HTTP is allowed for localhost only).';
  }
  if (!supabaseAnonKey) return 'VITE_SUPABASE_ANON_KEY is missing from the project .env file.';
  if (!isValidPublicKey(supabaseAnonKey)) {
    return 'VITE_SUPABASE_ANON_KEY must be a Supabase anon JWT or publishable key. Never use a secret or service-role key in the browser.';
  }
  return null;
}

export const isSupabaseConfigured = getSupabaseConfigurationError() === null;

if (!isSupabaseConfigured) {
  console.warn(`[CivicFix] Supabase is unavailable: ${getSupabaseConfigurationError()}`);
}

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(getSupabaseConfigurationError() || 'Supabase is not configured.');
  }
  return supabase;
}

export const getSupabaseOAuthRedirectUrl = (): string => {
  const configuredUrl =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_REDIRECT_URL;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  let redirectOrigin = currentOrigin;

  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) {
        redirectOrigin = parsed.origin;
      } else {
        console.error('[CivicFix] OAuth redirect URL must use HTTPS, except for localhost development.');
      }
    } catch {
      console.error('[CivicFix] OAuth redirect URL is invalid. Falling back to the current app origin.');
    }
  }

  return new URL('/auth/callback', redirectOrigin).toString();
};
