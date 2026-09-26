import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env || {};

const DEFAULT_SUPABASE_URL = 'https://xemenxdhuoekytyhmgyt.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbWVueGRodW9la3l0eWhtZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDE2MzAsImV4cCI6MjEwNTc3NzYzMH0.P-q6bQspwuQNhub08hjWmsjLrugr3CVA1NIdznWJxuo';

function resolveSupabaseUrl(): string {
  const envUrl = metaEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);

  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim();

    // Check if it's a valid HTTP / HTTPS URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return trimmed;
        }
      } catch {
        // Fall through to other checks
      }
    }

    // Se o valor injetado for um token JWT (começa com eyJ...), extrai o ref
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
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);
  if (typeof envKey === 'string' && envKey.trim().startsWith('eyJ')) {
    return envKey.trim();
  }

  // Caso o usuário tenha colado o token JWT no campo VITE_SUPABASE_URL por engano
  const envUrl = metaEnv.VITE_SUPABASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim().startsWith('eyJ')) {
    return envUrl.trim();
  }

  return DEFAULT_ANON_KEY;
}

export const SUPABASE_URL = resolveSupabaseUrl();
export const SUPABASE_ANON_KEY = resolveSupabaseAnonKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
