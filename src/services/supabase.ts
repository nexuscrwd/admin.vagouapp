import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env || {};

const DEFAULT_SUPABASE_URL = 'https://xemenxdhuoekytyhmgyt.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbWVueGRodW9la3l0eWhtZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDE2MzAsImV4cCI6MjEwNTc3NzYzMH0.P-q6bQspwuQNhub08hjWmsjLrugr3CVA1NIdznWJxuo';

function resolveSupabaseUrl(): string {
  const envUrl = metaEnv.VITE_SUPABASE_URL;

  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return trimmed;
        }
      } catch {

      }
    }

    if (trimmed.startsWith('eyJ')) {
      try {
        const parts = trimmed.split('.');
        if (parts[1]) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload?.ref) {
            return `https://${payload.ref}.supabase.co`;
          }
        }
      } catch {}
    }
  }

  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseAnonKey(): string {
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY;
  if (typeof envKey === 'string' && envKey.trim().startsWith('eyJ')) {
    return envKey.trim();
  }

  const envUrl = metaEnv.VITE_SUPABASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().startsWith('eyJ')) {
    return envUrl.trim();
  }

  return DEFAULT_ANON_KEY;
}

const SUPABASE_URL = resolveSupabaseUrl();
const SUPABASE_ANON_KEY = resolveSupabaseAnonKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabaseAdmin = supabase;
