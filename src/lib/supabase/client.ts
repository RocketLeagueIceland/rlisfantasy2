import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock client for build time when env vars aren't available
const mockClient = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => ({ data: { provider: '', url: '' }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        order: () => ({
          limit: () => ({
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      order: () => ({
        order: () => ({ data: [], error: null }),
        limit: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    insert: async () => ({ data: null, error: null }),
    update: () => ({
      eq: async () => ({ error: null }),
    }),
    delete: () => ({
      eq: async () => ({ error: null }),
    }),
  }),
} as unknown as SupabaseClient;

export function createClient(): SupabaseClient {
  // Check for env vars each time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During SSR/build, env vars might not be available
  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
    return mockClient;
  }

  // Create a fresh client each time to avoid initialization deadlock issues
  return createBrowserClient(supabaseUrl, supabaseKey);
}
