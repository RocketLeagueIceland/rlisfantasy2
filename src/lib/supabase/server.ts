import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Mock client for build time when env vars aren't available.
// Query builders are chain-agnostic: any method returns the same thenable
// stub, and awaiting it (or calling a terminal method) resolves to
// { data: null, error: null, count: null }, so any query shape is safe.
function createMockQueryBuilder(): unknown {
  const result = { data: null, error: null, count: null };
  const target = () => {};
  const proxy: unknown = new Proxy(target, {
    get(_obj, prop) {
      if (prop === 'then') {
        return (resolve: (v: typeof result) => void) => resolve(result);
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return async () => result;
      }
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy;
}

function createMockClient(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
    },
    from: () => createMockQueryBuilder(),
    rpc: () => createMockQueryBuilder(),
  } as unknown as SupabaseClient;
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
    return createMockClient();
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl === 'your_supabase_project_url') {
    return createMockClient();
  }

  return createSupabaseClient(supabaseUrl, serviceKey);
}
